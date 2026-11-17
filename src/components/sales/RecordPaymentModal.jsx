import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, ChevronRight, IndianRupee, Info, Plus, Search, Sparkles } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { formatMoney, localToday, shortDay } from '../../lib/format';
import { PAY_MODES } from '../../lib/sales';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { Field, Input, Select, Textarea } from '../ui/Field';
import SearchSelect from '../tasks/SearchSelect';
import BankSelect from '../BankSelect';
import FirmSelect from '../FirmSelect';

/**
 * Record Payment modal:
 * - Against an existing pending sale
 * - OR Direct Collection / New Work without needing a pre-existing sale or service
 * - OR Advance / On-Account payment
 */
export default function RecordPaymentModal({ open, onClose, onDone, initialCustomer, initialSale }) {
  const [tab, setTab] = useState('pending'); // 'pending' | 'direct'
  const [sales, setSales] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [saving, setSaving] = useState(false);

  // Direct payment form states
  const [customers, setCustomers] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [customerServices, setCustomerServices] = useState([]);
  const [customerGsts, setCustomerGsts] = useState([]);
  const [customerPendingTotal, setCustomerPendingTotal] = useState(0);

  // Form data for recording payment on selected sale
  const [saleForm, setSaleForm] = useState({
    amount: '',
    discount: '',
    date: localToday(),
    mode: 'Cash',
    bank: '',
    reference: '',
    note: '',
  });

  // Form data for direct payment
  const [directForm, setDirectForm] = useState({
    customer: '',
    customerService: '',
    service: '',
    gstNumber: '',
    title: '',
    amount: '',
    govtFee: '',
    totalAmount: '',
    date: localToday(),
    mode: 'Cash',
    bank: '',
    reference: '',
    note: '',
    isAdvance: false,
  });

  // Load pending sales & metadata when opened
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedSale(initialSale || null);
    setTab(initialSale ? 'pending' : 'pending');
    setSales(null);

    // Load open sales
    api.get('/sales', { params: { status: 'open', from: '2000-01-01', to: localToday() } })
      .then((r) => {
        setSales(r.data.data || []);
      })
      .catch((err) => {
        toast.error(errorMessage(err));
        setSales([]);
      });

    // Load customers and company services for direct payment
    api.get('/customers/options').then((r) => setCustomers(r.data.data || [])).catch(() => setCustomers([]));
    api.get('/services', { params: { active: true } }).then((r) => setAllServices(r.data.services || [])).catch(() => setAllServices([]));

    // Reset direct form
    setDirectForm({
      customer: initialCustomer || '',
      customerService: '',
      service: '',
      gstNumber: '',
      title: '',
      amount: '',
      govtFee: '',
      totalAmount: '',
      date: localToday(),
      mode: 'Cash',
      bank: '',
      reference: '',
      note: '',
      isAdvance: false,
    });
  }, [open, initialCustomer, initialSale]);

  // When a sale is selected in pending tab, initialise its payment fields
  useEffect(() => {
    if (selectedSale) {
      setSaleForm({
        amount: String(selectedSale.balance),
        discount: '',
        date: localToday(),
        mode: 'Cash',
        bank: '',
        reference: '',
        note: '',
      });
    }
  }, [selectedSale]);

  // When a customer is picked in direct payment, load their details (firms, assigned services, open balance)
  useEffect(() => {
    if (!open || !directForm.customer) {
      setCustomerServices([]);
      setCustomerGsts([]);
      setCustomerPendingTotal(0);
      return;
    }
    api.get(`/customers/${directForm.customer}`)
      .then((r) => {
        setCustomerServices(r.data.services || []);
        const gsts = r.data.customer?.gsts || [];
        setCustomerGsts(gsts);
        if (gsts.length === 1 && !directForm.gstNumber) {
          setDirectForm((prev) => ({ ...prev, gstNumber: gsts[0].gstNumber }));
        }
      })
      .catch(() => {
        setCustomerServices([]);
        setCustomerGsts([]);
      });

    // Check if this customer has pending sales
    api.get('/sales', { params: { customer: directForm.customer, status: 'open', from: '2000-01-01', to: localToday() } })
      .then((r) => {
        const list = r.data.data || [];
        const tot = list.reduce((sum, s) => sum + (s.balance || 0), 0);
        setCustomerPendingTotal(tot);
      })
      .catch(() => setCustomerPendingTotal(0));
  }, [open, directForm.customer]);

  // Filtered sales for Pending tab
  const q = search.trim().toLowerCase();
  const filteredSales = (sales || []).filter(
    (s) =>
      !q ||
      [s.saleNo, s.title, s.customer?.businessName, s.customer?.phone, s.firmName].some((v) =>
        v?.toLowerCase().includes(q)
      )
  );

  // Submit payment on an existing sale
  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSale) return;
    const amount = Number(saleForm.amount) || 0;
    const discount = Number(saleForm.discount) || 0;
    if (amount + discount <= 0) return toast.error('Enter the amount received or discount');
    if (amount + discount > selectedSale.balance + 0.001) {
      return toast.error(`Only ${formatMoney(selectedSale.balance)} is pending on this sale`);
    }

    setSaving(true);
    try {
      const { data } = await api.post(`/sales/${selectedSale._id}/payments`, {
        ...saleForm,
        amount,
        discount,
      });
      toast.success(data.message || 'Payment recorded successfully');
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Submit direct payment (creates sale + payment or advance payment)
  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    if (!directForm.customer) return toast.error('Select a customer');
    const amount = Number(directForm.amount) || 0;
    if (amount <= 0) return toast.error('Enter the amount received');

    const govtFee = Number(directForm.govtFee) || 0;
    if (govtFee < 0) return toast.error('Government fee cannot be negative');
    if (govtFee > amount) return toast.error('Government fee cannot exceed the amount received');

    if (!directForm.isAdvance && !directForm.title?.trim()) {
      return toast.error('Enter the work description or select a service');
    }

    setSaving(true);
    try {
      const payload = {
        customer: directForm.customer,
        customerService: directForm.customerService || undefined,
        service: directForm.service || undefined,
        gstNumber: directForm.gstNumber || '',
        title: directForm.isAdvance ? (directForm.title?.trim() || 'Advance Payment') : directForm.title.trim(),
        amount,
        govtFee,
        totalAmount: directForm.totalAmount ? Number(directForm.totalAmount) : amount,
        date: directForm.date || localToday(),
        mode: directForm.mode || 'Cash',
        bank: directForm.bank || undefined,
        reference: directForm.reference?.trim() || '',
        note: directForm.note?.trim() || '',
        isAdvance: directForm.isAdvance,
      };

      const { data } = await api.post('/sales/direct-payment', payload);
      toast.success(data.message || 'Payment recorded successfully');
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePickServiceInDirect = (val) => {
    if (!val) {
      setDirectForm((prev) => ({ ...prev, customerService: '', service: '' }));
      return;
    }
    if (val.startsWith('cs:')) {
      const csId = val.slice(3);
      const s = customerServices.find((x) => x._id === csId);
      setDirectForm((prev) => ({
        ...prev,
        customerService: csId,
        service: s?.service?._id || '',
        title: [s?.service?.name, s?.periodLabel].filter(Boolean).join(' · ') || prev.title,
        amount: s?.service?.price ? String(s.service.price) : prev.amount,
        totalAmount: s?.service?.price ? String(s.service.price) : prev.totalAmount,
        ...(s?.gstNumber && { gstNumber: s.gstNumber }),
      }));
    } else if (val.startsWith('s:')) {
      const sId = val.slice(2);
      const s = allServices.find((x) => x._id === sId);
      setDirectForm((prev) => ({
        ...prev,
        customerService: '',
        service: sId,
        title: s?.name || prev.title,
        amount: s?.price ? String(s.price) : prev.amount,
        totalAmount: s?.price ? String(s.price) : prev.totalAmount,
      }));
    }
  };

  const pendingCount = (sales || []).length;
  const leftOnSelected = selectedSale
    ? selectedSale.balance - (Number(saleForm.amount) || 0) - (Number(saleForm.discount) || 0)
    : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      scroll
      title="Record Payment"
      description={
        selectedSale
          ? `Record payment on ${selectedSale.saleNo} · ${selectedSale.customer?.businessName || ''}`
          : 'Record payment against an existing pending sale or add a direct payment.'
      }
      footer={
        selectedSale ? (
          <>
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => setSelectedSale(null)}
              disabled={saving}
            >
              Back to Sales
            </Button>
            <span className="mr-auto" />
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="collect-sale-form" loading={saving}>
              Save Payment
            </Button>
          </>
        ) : tab === 'direct' ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="direct-payment-form" loading={saving}>
              Save Payment
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {/* Tab Switcher (when not in middle of collecting on a specific selected sale) */}
      {!selectedSale && (
        <div className="mb-4 flex rounded-lg bg-zinc-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`flex-1 rounded-md py-1.5 text-center transition-all ${
              tab === 'pending'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Against Pending Sale {pendingCount > 0 && <span className="ml-1 text-xs text-zinc-400 font-normal">({pendingCount})</span>}
          </button>
          <button
            type="button"
            onClick={() => setTab('direct')}
            className={`flex-1 rounded-md py-1.5 text-center transition-all ${
              tab === 'direct'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Direct Collection / New Work
          </button>
        </div>
      )}

      {/* --- VIEW 1: Collecting on a chosen sale --- */}
      {selectedSale ? (
        <form id="collect-sale-form" onSubmit={handleSaleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-50 p-3 text-center text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-400">Total</div>
              <div className="font-semibold">{formatMoney(selectedSale.totalAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-400">Received</div>
              <div className="font-semibold text-emerald-700">{formatMoney(selectedSale.receivedAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-400">Pending</div>
              <div className="font-semibold text-rose-600">{formatMoney(selectedSale.balance)}</div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount received (₹)">
              <Input
                type="number"
                min="0"
                step="any"
                max={selectedSale.balance}
                value={saleForm.amount}
                onChange={(e) => setSaleForm({ ...saleForm, amount: e.target.value })}
                autoFocus
              />
            </Field>
            <Field label="Discount / write-off (₹)" hint="Waived — reduces what they owe">
              <Input
                type="number"
                min="0"
                step="any"
                value={saleForm.discount}
                onChange={(e) => setSaleForm({ ...saleForm, discount: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                max={localToday()}
                value={saleForm.date}
                onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
              />
            </Field>
            <Field label="Mode">
              <Select
                value={saleForm.mode}
                onChange={(e) => setSaleForm({ ...saleForm, mode: e.target.value })}
              >
                {PAY_MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <BankSelect
              label="Received in"
              value={saleForm.bank}
              onChange={(v) => setSaleForm({ ...saleForm, bank: v })}
              disabled={!Number(saleForm.amount)}
            />
            <Field label="Reference" hint="UTR / cheque no. / Sr no">
              <Input
                value={saleForm.reference}
                onChange={(e) => setSaleForm({ ...saleForm, reference: e.target.value })}
              />
            </Field>
            <Field label="Note" className="sm:col-span-2">
              <Input
                value={saleForm.note}
                onChange={(e) => setSaleForm({ ...saleForm, note: e.target.value })}
                placeholder="Optional note"
              />
            </Field>
          </div>

          <p className={`text-sm ${leftOnSelected < 0 ? 'text-rose-600' : 'text-zinc-600'}`}>
            {leftOnSelected < 0
              ? 'Entered amount is more than what is pending.'
              : `Pending after this: ${formatMoney(leftOnSelected)}`}
          </p>
        </form>
      ) : tab === 'pending' ? (
        /* --- VIEW 2: Pending Sales List --- */
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, mobile, work, sale no…"
              className="pl-9"
            />
          </div>

          {!sales ? (
            <Spinner />
          ) : filteredSales.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center">
              <p className="text-sm text-zinc-500 mb-2">
                {sales.length ? 'No matching pending sales.' : 'No pending payments found.'}
              </p>
              <p className="text-xs text-zinc-400 mb-4">
                Want to record payment without an existing sale or service?
              </p>
              <Button
                icon={Plus}
                onClick={() => {
                  setTab('direct');
                  if (search) {
                    setDirectForm((prev) => ({ ...prev, title: search }));
                  }
                }}
              >
                Record Direct Payment
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
              {filteredSales.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => setSelectedSale(s)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {s.customer?.businessName || '—'}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      <span className="font-mono font-semibold">{s.saleNo}</span> · {s.title} · {shortDay(s.saleDate)}
                      {s.firmName && <span className="text-blue-700"> · {s.firmName}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div className="text-sm font-semibold text-rose-600">{formatMoney(s.balance)}</div>
                    <div className="text-[11px] text-zinc-400">of {formatMoney(s.totalAmount)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2.5 text-xs text-zinc-600">
            <span>Customer has no existing sale or need to record direct payment?</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setTab('direct');
                if (search) setDirectForm((prev) => ({ ...prev, title: search }));
              }}
            >
              Direct Payment →
            </Button>
          </div>
        </div>
      ) : (
        /* --- VIEW 3: Direct Payment / New Work Form --- */
        <form id="direct-payment-form" onSubmit={handleDirectSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer" required>
              <SearchSelect
                width="w-full"
                options={customers.map((c) => ({ value: c._id, label: c.businessName }))}
                value={directForm.customer || 'all'}
                onChange={(v) =>
                  setDirectForm((prev) => ({
                    ...prev,
                    customer: v === 'all' ? '' : v,
                    customerService: '',
                    gstNumber: '',
                  }))
                }
                allLabel="Select customer…"
                placeholder="Search customer..."
              />
            </Field>

            <Field label="Service / Work" hint="Select a company service, assigned service, or type custom work">
              <Select
                value={
                  directForm.customerService
                    ? `cs:${directForm.customerService}`
                    : directForm.service
                    ? `s:${directForm.service}`
                    : ''
                }
                onChange={(e) => handlePickServiceInDirect(e.target.value)}
                disabled={!directForm.customer || directForm.isAdvance}
              >
                <option value="">— Other work / Custom —</option>
                {customerServices.length > 0 && (
                  <optgroup label="Customer's Assigned Services">
                    {customerServices.map((s) => (
                      <option key={s._id} value={`cs:${s._id}`}>
                        {s.service?.name}
                        {s.periodLabel ? ` · ${s.periodLabel}` : ''}
                        {s.firmName || s.gstNumber ? ` · ${s.firmName || s.gstNumber}` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {allServices.length > 0 && (
                  <optgroup label="Company Services">
                    {allServices.map((s) => (
                      <option key={s._id} value={`s:${s._id}`}>
                        {s.name} {s.price ? `(₹${s.price})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </Select>
            </Field>
          </div>

          {/* Pending alert if customer already owes money */}
          {customerPendingTotal > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  This customer has <b>{formatMoney(customerPendingTotal)}</b> pending on existing sales.
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const custName = customers.find((c) => c._id === directForm.customer)?.businessName || '';
                  setSearch(custName);
                  setTab('pending');
                }}
                className="text-amber-900 underline hover:bg-amber-100"
              >
                Pay pending sale
              </Button>
            </div>
          )}

          {customerGsts.length > 0 && (
            <FirmSelect
              gsts={customerGsts}
              value={directForm.gstNumber}
              onChange={(v) => setDirectForm((prev) => ({ ...prev, gstNumber: v }))}
              customerName={customers.find((c) => c._id === directForm.customer)?.businessName}
              disabled={directForm.isAdvance}
            />
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
              <input
                type="checkbox"
                checked={directForm.isAdvance}
                onChange={(e) =>
                  setDirectForm((prev) => ({
                    ...prev,
                    isAdvance: e.target.checked,
                    ...(e.target.checked && { title: 'Advance / On account' }),
                  }))
                }
                className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900"
              />
              <span>Advance / On-account payment (credit customer's account without creating a sale)</span>
            </label>
          </div>

          {!directForm.isAdvance && (
            <Field label="Work description" required>
              <Input
                required
                value={directForm.title}
                onChange={(e) => setDirectForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Affidavit, GST Filing, Consultation"
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount received (₹)" required>
              <Input
                type="number"
                min="0"
                step="any"
                required
                value={directForm.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  setDirectForm((prev) => ({
                    ...prev,
                    amount: val,
                    totalAmount: prev.totalAmount && Number(prev.totalAmount) > Number(val) ? prev.totalAmount : val,
                  }));
                }}
                placeholder="0"
                autoFocus
              />
            </Field>
            {!directForm.isAdvance && (
              <>
                <Field label="Government fee (₹)" hint="Paid to govt — not income">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={directForm.govtFee}
                    onChange={(e) => setDirectForm((prev) => ({ ...prev, govtFee: e.target.value }))}
                    placeholder="0"
                  />
                </Field>
                <Field label="Total bill (₹)" hint="If more than received">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={directForm.totalAmount}
                    onChange={(e) => setDirectForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
                    placeholder={directForm.amount || '0'}
                  />
                </Field>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input
                type="date"
                max={localToday()}
                value={directForm.date}
                onChange={(e) => setDirectForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </Field>
            <Field label="Payment mode">
              <Select
                value={directForm.mode}
                onChange={(e) => setDirectForm((prev) => ({ ...prev, mode: e.target.value }))}
              >
                {PAY_MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <BankSelect
              label="Received in"
              value={directForm.bank}
              onChange={(v) => setDirectForm((prev) => ({ ...prev, bank: v }))}
              disabled={!Number(directForm.amount)}
            />
            <Field label="Reference" hint="UTR / cheque no. / Sr no">
              <Input
                value={directForm.reference}
                onChange={(e) => setDirectForm((prev) => ({ ...prev, reference: e.target.value }))}
                placeholder="Receipt / UTR #"
              />
            </Field>
          </div>

          <Field label="Note">
            <Input
              value={directForm.note}
              onChange={(e) => setDirectForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Optional notes"
            />
          </Field>
        </form>
      )}
    </Modal>
  );
}
