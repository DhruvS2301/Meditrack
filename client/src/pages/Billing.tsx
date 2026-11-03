import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  CreditCard,
  Plus,
  Trash2,
  Eye,
  Printer,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Search,
  Receipt,
  FileCheck2,
  ArrowDownLeft,
  XCircle,
  Edit2
} from 'lucide-react';
import { billService, patientService } from '../services';
import { Bill, BillItem, Payment, Patient } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';

interface BillFormData {
  patient_id: number;
  bill_date: string;
  due_date?: string;
  discount_amount: number;
  tax_amount: number;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface EditBillFormData {
  due_date?: string;
  discount_amount: number;
  tax_amount: number;
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Cancelled';
  notes?: string;
}

interface PaymentFormData {
  amount: number;
  payment_method: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';
  payment_date: string;
  transaction_reference?: string;
  payment_status: 'Completed' | 'Pending' | 'Failed';
}

export default function Billing() {
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Dropdown patients
  const [patients, setPatients] = useState<Patient[]>([]);

  // Modals
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Edit, Cancel, Delete states
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [cancellingBill, setCancellingBill] = useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form hooks
  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<BillFormData>({
    defaultValues: {
      bill_date: new Date().toISOString().split('T')[0],
      discount_amount: 0,
      tax_amount: 0,
      items: [
        { description: 'Consultation Fee', quantity: 1, unit_price: 500 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const {
    register: registerPayment,
    handleSubmit: handleSubmitPayment,
    reset: resetPayment,
    formState: { errors: errorsPayment, isSubmitting: isSubmittingPayment },
  } = useForm<PaymentFormData>();

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
  } = useForm<EditBillFormData>();

  const watchedItems = watch('items') || [];
  const watchedDiscount = watch('discount_amount') || 0;
  const watchedTax = watch('tax_amount') || 0;

  const calculatedSubtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );
  const calculatedTotal = Math.max(0, calculatedSubtotal - Number(watchedDiscount) + Number(watchedTax));

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await patientService.getAll({ limit: 100 });
        setPatients(res.data || []);
      } catch (err: any) {
        console.error('Failed to load patients', err);
      }
    }
    loadPatients();
  }, []);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await billService.getAll({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: filterStatus || undefined,
      });
      setBills(res.data);
      setTotalPages(res.pagination.pages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      toast('error', 'Failed to fetch bills', err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBills();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchBills]);

  const openGenerateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    reset({
      patient_id: undefined,
      bill_date: today,
      due_date: dueDate,
      discount_amount: 0,
      tax_amount: 0,
      notes: '',
      items: [
        { description: 'Consultation Services', quantity: 1, unit_price: 500 },
      ],
    });
    setIsGenerateOpen(true);
  };

  const onGenerateSubmit = async (data: BillFormData) => {
    try {
      if (data.items.length === 0) {
        toast('warning', 'Missing Line Items', 'Bill must have at least one billable item.');
        return;
      }
      await billService.create({
        ...data,
        patient_id: Number(data.patient_id),
        discount_amount: Number(data.discount_amount) || 0,
        tax_amount: Number(data.tax_amount) || 0,
        due_date: data.due_date || null,
        items: data.items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
      });
      toast('success', 'Bill generated', 'Invoice created with itemized breakdown.');
      setIsGenerateOpen(false);
      fetchBills();
    } catch (err: any) {
      toast('error', 'Generation failed', err.message);
    }
  };

  const openViewModal = async (b: Bill) => {
    try {
      const fullBill = await billService.getById(b.bill_id);
      setViewingBill(fullBill);
    } catch (err: any) {
      toast('error', 'Failed to load bill details', err.message);
    }
  };

  const openPaymentModal = (b: Bill) => {
    const outstanding = Number(b.outstanding ?? b.total_amount);
    resetPayment({
      amount: outstanding > 0 ? outstanding : 0,
      payment_method: 'UPI',
      payment_date: new Date().toISOString().slice(0, 16),
      transaction_reference: '',
      payment_status: 'Completed',
    });
    setIsPaymentModalOpen(true);
  };

  const onPaymentSubmit = async (data: PaymentFormData) => {
    if (!viewingBill) return;
    try {
      await billService.addPayment(viewingBill.bill_id, {
        ...data,
        amount: Number(data.amount),
        payment_date: new Date(data.payment_date).toISOString(),
        transaction_reference: data.transaction_reference || null,
      });
      toast('success', 'Payment recorded', `Payment of ₹${data.amount} successfully processed.`);
      setIsPaymentModalOpen(false);
      // Reload viewing bill
      const updated = await billService.getById(viewingBill.bill_id);
      setViewingBill(updated);
      fetchBills();
    } catch (err: any) {
      toast('error', 'Payment failed', err.message);
    }
  };

  const openEditModal = (b: Bill) => {
    setEditingBill(b);
    resetEdit({
      due_date: b.due_date ? b.due_date.split('T')[0] : '',
      discount_amount: Number(b.discount_amount) || 0,
      tax_amount: Number(b.tax_amount) || 0,
      status: b.status as any,
      notes: b.notes || '',
    });
  };

  const onEditSubmit = async (data: EditBillFormData) => {
    if (!editingBill) return;
    try {
      await billService.update(editingBill.bill_id, {
        due_date: data.due_date || null,
        discount_amount: Number(data.discount_amount) || 0,
        tax_amount: Number(data.tax_amount) || 0,
        status: data.status,
        notes: data.notes || null,
      });
      toast('success', 'Invoice updated', `Invoice ${editingBill.bill_number} updated successfully.`);
      setEditingBill(null);
      if (viewingBill && viewingBill.bill_id === editingBill.bill_id) {
        const refreshed = await billService.getById(editingBill.bill_id);
        setViewingBill(refreshed);
      }
      fetchBills();
    } catch (err: any) {
      toast('error', 'Update failed', err.message);
    }
  };

  const handleCancelBill = async () => {
    if (!cancellingBill) return;
    try {
      setActionLoading(true);
      await billService.update(cancellingBill.bill_id, { status: 'Cancelled' });
      toast('success', 'Invoice cancelled', `Invoice ${cancellingBill.bill_number} marked as Cancelled.`);
      setCancellingBill(null);
      if (viewingBill && viewingBill.bill_id === cancellingBill.bill_id) {
        setViewingBill({ ...viewingBill, status: 'Cancelled' });
      }
      fetchBills();
    } catch (err: any) {
      toast('error', 'Cancellation failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBill = async () => {
    if (!deletingBill) return;
    try {
      setActionLoading(true);
      await billService.delete(deletingBill.bill_id);
      toast('success', 'Invoice deleted', `Invoice ${deletingBill.bill_number} removed from database.`);
      setDeletingBill(null);
      if (viewingBill && viewingBill.bill_id === deletingBill.bill_id) {
        setViewingBill(null);
      }
      fetchBills();
    } catch (err: any) {
      toast('error', 'Deletion failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Invoicing & Revenue Settlement</h1>
          <p className="text-sm text-text-secondary">
            Generate itemized patient invoices, record multi-channel payments, and monitor outstanding ledger balances.
          </p>
        </div>
        <button onClick={openGenerateModal} className="btn btn-primary">
          <Receipt size={16} /> Generate Invoice
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search patient or bill #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-input pl-9 text-xs"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="form-select w-full sm:w-44 text-xs"
          >
            <option value="">All Bill Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="text-xs text-text-secondary self-start sm:self-center">
          Invoices in view: <strong className="text-text-primary">{totalCount}</strong>
        </div>
      </div>

      {/* Bills Data Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : bills.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No Invoices Found"
            description="No billing statements match the specified search and filter criteria."
            action={
              <button onClick={openGenerateModal} className="btn btn-primary btn-sm">
                Generate First Bill
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill Number</th>
                  <th>Patient</th>
                  <th>Bill Date</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.bill_id}>
                    <td className="font-mono text-xs font-semibold text-accent">{b.bill_number}</td>
                    <td>
                      <div className="font-medium text-text-primary">{b.patient_name}</div>
                      <div className="text-xs text-text-secondary">{b.patient_code}</div>
                    </td>
                    <td className="text-xs text-text-secondary">{b.bill_date}</td>
                    <td className="font-semibold text-text-primary">
                      ₹{Number(b.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-positive font-medium">
                      ₹{Number(b.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-critical font-medium">
                      ₹{Number(b.outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openViewModal(b)}
                          className="btn btn-ghost btn-sm p-1.5"
                          title="View Breakdown & Payments"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(b)}
                          className="btn btn-ghost btn-sm p-1.5 text-accent hover:bg-accent-light"
                          title="Edit Invoice Parameters"
                        >
                          <Edit2 size={14} />
                        </button>
                        {b.status !== 'Paid' && b.status !== 'Cancelled' && (
                          <>
                            <button
                              onClick={() => {
                                openViewModal(b).then(() => openPaymentModal(b));
                              }}
                              className="btn btn-secondary btn-sm text-xs py-1 px-2"
                              title="Record Payment"
                            >
                              Pay
                            </button>
                            <button
                              onClick={() => setCancellingBill(b)}
                              className="btn btn-ghost btn-sm p-1.5 text-warning hover:bg-warning-light"
                              title="Cancel Invoice"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {Number(b.amount_paid || 0) === 0 && (
                          <button
                            onClick={() => setDeletingBill(b)}
                            className="btn btn-ghost btn-sm p-1.5 text-critical hover:bg-critical-light"
                            title="Delete Invoice Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        pages={totalPages}
        total={totalCount}
        limit={15}
        onChange={(p) => setPage(p)}
      />

      {/* View Bill Details Modal */}
      {viewingBill && (
        <Modal
          isOpen={Boolean(viewingBill)}
          onClose={() => setViewingBill(null)}
          title={`Hospital Invoice: ${viewingBill.bill_number}`}
          maxWidth={680}
        >
          <div className="space-y-4">
            {/* Invoice Header */}
            <div className="p-3 bg-bg rounded border border-border flex items-start justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Billed To</span>
                <div className="font-bold text-sm text-text-primary">{viewingBill.patient_name}</div>
                <div className="text-xs text-text-secondary">Code: {viewingBill.patient_code}</div>
              </div>
              <div className="text-right space-y-1">
                <span className="font-mono text-xs font-bold text-accent">{viewingBill.bill_number}</span>
                <div className="text-xs text-text-secondary">Date: {viewingBill.bill_date}</div>
                <div><StatusBadge status={viewingBill.status} /></div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-2">
                Services & Medical Charges
              </span>
              <div className="card overflow-hidden border border-border">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingBill.items?.map((item) => (
                      <tr key={item.bill_item_id}>
                        <td className="font-medium text-text-primary">{item.description}</td>
                        <td className="text-right font-mono text-xs">{item.quantity}</td>
                        <td className="text-right text-xs">₹{Number(item.unit_price).toFixed(2)}</td>
                        <td className="text-right font-semibold text-text-primary">
                          ₹{Number(item.line_total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subtotals & Balances */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal:</span>
                  <span>₹{Number(viewingBill.subtotal).toFixed(2)}</span>
                </div>
                {Number(viewingBill.discount_amount) > 0 && (
                  <div className="flex justify-between text-positive">
                    <span>Discount:</span>
                    <span>- ₹{Number(viewingBill.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                {Number(viewingBill.tax_amount) > 0 && (
                  <div className="flex justify-between text-text-secondary">
                    <span>Tax:</span>
                    <span>+ ₹{Number(viewingBill.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-text-primary border-t border-border pt-1">
                  <span>Total Amount:</span>
                  <span>₹{Number(viewingBill.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-positive">
                  <span>Amount Paid:</span>
                  <span>₹{Number(viewingBill.amount_paid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-critical border-t border-border pt-1">
                  <span>Outstanding Balance:</span>
                  <span>₹{Number(viewingBill.outstanding || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {viewingBill.payments && viewingBill.payments.length > 0 && (
              <div className="border-t border-border pt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-2">
                  Payment History & Ledger
                </span>
                <div className="card overflow-hidden border border-border">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Status</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingBill.payments.map((p) => (
                        <tr key={p.payment_id}>
                          <td className="text-xs">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="font-medium text-xs">{p.payment_method}</td>
                          <td className="font-mono text-[11px] text-text-secondary">{p.transaction_reference || '—'}</td>
                          <td>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                p.payment_status === 'Completed'
                                  ? 'bg-positive-light text-positive'
                                  : p.payment_status === 'Failed'
                                  ? 'bg-critical-light text-critical'
                                  : 'bg-warning-light text-warning'
                              }`}
                            >
                              {p.payment_status}
                            </span>
                          </td>
                          <td className="text-right font-semibold text-xs text-text-primary">
                            ₹{Number(p.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <button
                onClick={() => window.print()}
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Invoice
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const b = viewingBill;
                    openEditModal(b);
                  }}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5"
                  title="Edit Invoice Parameters"
                >
                  <Edit2 size={13} /> Edit
                </button>
                {viewingBill.status !== 'Paid' && viewingBill.status !== 'Cancelled' && (
                  <>
                    <button
                      onClick={() => openPaymentModal(viewingBill)}
                      className="btn btn-primary btn-sm"
                    >
                      Record Payment
                    </button>
                    <button
                      onClick={() => setCancellingBill(viewingBill)}
                      className="btn btn-ghost btn-sm text-warning hover:bg-warning-light flex items-center gap-1.5"
                    >
                      <XCircle size={13} /> Cancel
                    </button>
                  </>
                )}
                {Number(viewingBill.amount_paid || 0) === 0 && (
                  <button
                    onClick={() => setDeletingBill(viewingBill)}
                    className="btn btn-ghost btn-sm text-critical hover:bg-critical-light flex items-center gap-1.5"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
                <button onClick={() => setViewingBill(null)} className="btn btn-secondary btn-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && viewingBill && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Payment for ${viewingBill.bill_number}`}
          maxWidth={460}
        >
          <form onSubmit={handleSubmitPayment(onPaymentSubmit)} className="space-y-4">
            <div className="p-3 bg-bg rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">Patient:</span>
                <span className="font-semibold text-text-primary">{viewingBill.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Outstanding Amount:</span>
                <span className="font-bold text-critical">₹{Number(viewingBill.outstanding || 0).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="form-label">Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                className={`form-input font-semibold text-text-primary ${errorsPayment.amount ? 'error' : ''}`}
                {...registerPayment('amount', {
                  required: 'Amount is required',
                  min: { value: 1, message: 'Amount must be positive' },
                })}
              />
              {errorsPayment.amount && <p className="form-error">{errorsPayment.amount.message}</p>}
            </div>

            <div>
              <label className="form-label">Payment Method *</label>
              <select className="form-select" {...registerPayment('payment_method', { required: true })}>
                <option value="UPI">UPI</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Payment Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input text-xs"
                {...registerPayment('payment_date', { required: true })}
              />
            </div>

            <div>
              <label className="form-label">Transaction / Bank Reference</label>
              <input
                type="text"
                placeholder="e.g. UPI-REF-98124982 or TXN-002"
                className="form-input font-mono text-xs"
                {...registerPayment('transaction_reference')}
              />
            </div>

            <div>
              <label className="form-label">Payment Gateway Status</label>
              <select className="form-select text-xs" {...registerPayment('payment_status')}>
                <option value="Completed">Completed (Successful)</option>
                <option value="Pending">Pending (Processing)</option>
                <option value="Failed">Failed (Declined)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="btn btn-primary"
              >
                {isSubmittingPayment ? 'Processing...' : 'Submit Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Generate Bill Modal */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generate Patient Invoice"
        maxWidth={700}
      >
        <form onSubmit={handleSubmit(onGenerateSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="form-label">Patient *</label>
              <select
                className={`form-select ${errors.patient_id ? 'error' : ''}`}
                {...register('patient_id', { required: 'Please select a patient' })}
              >
                <option value="">Select patient to bill...</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.full_name} ({p.patient_code}) — {p.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Invoice Date *</label>
              <input
                type="date"
                className="form-input"
                {...register('bill_date', { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                {...register('due_date')}
              />
            </div>
            <div>
              <label className="form-label">Discount Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                {...register('discount_amount', { min: 0 })}
              />
            </div>
            <div>
              <label className="form-label">Tax Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                {...register('tax_amount', { min: 0 })}
              />
            </div>
          </div>

          {/* Dynamic Bill Items */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-border pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Itemized Hospital Services & Fees
              </span>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unit_price: 100 })}
                className="btn btn-secondary btn-sm text-xs py-1 px-2"
              >
                <Plus size={12} /> Add Service Item
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-bg rounded border border-border">
                  <div className="col-span-6">
                    <input
                      type="text"
                      placeholder="e.g. Diagnostic Lab Test, Room Charge"
                      className="form-input text-xs"
                      {...register(`items.${idx}.description`, { required: true })}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      className="form-input text-xs"
                      {...register(`items.${idx}.quantity`, { required: true, min: 1 })}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      className="form-input text-xs"
                      {...register(`items.${idx}.unit_price`, { required: true, min: 0 })}
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="text-text-secondary hover:text-critical p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Live Total preview */}
            <div className="p-3 bg-bg rounded border border-border flex justify-between items-center text-xs">
              <div>
                <span className="text-text-secondary">Subtotal: </span>
                <span className="font-semibold text-text-primary">₹{calculatedSubtotal.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-text-secondary">Estimated Net Total: </span>
                <span className="text-sm font-bold text-accent">₹{calculatedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Creating Invoice...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Bill Modal */}
      {editingBill && (
        <Modal
          isOpen={Boolean(editingBill)}
          onClose={() => setEditingBill(null)}
          title={`Edit Invoice: ${editingBill.bill_number}`}
          maxWidth={500}
        >
          <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
            <div className="p-3 bg-bg rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">Patient:</span>
                <span className="font-semibold text-text-primary">{editingBill.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal Services:</span>
                <span className="font-mono font-medium">₹{Number(editingBill.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Amount Paid:</span>
                <span className="font-mono text-positive font-medium">₹{Number(editingBill.amount_paid || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input text-xs"
                  {...registerEdit('due_date')}
                />
              </div>
              <div>
                <label className="form-label">Invoice Status</label>
                <select className="form-select text-xs" {...registerEdit('status')}>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Discount Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input text-xs"
                  {...registerEdit('discount_amount', { min: 0 })}
                />
              </div>
              <div>
                <label className="form-label">Tax Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input text-xs"
                  {...registerEdit('tax_amount', { min: 0 })}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Notes / Remarks</label>
              <textarea
                rows={2}
                placeholder="Audit notes or billing adjustments"
                className="form-textarea text-xs"
                {...registerEdit('notes')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingEdit}
                className="btn btn-primary"
              >
                {isSubmittingEdit ? 'Saving...' : 'Update Invoice'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Invoice Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(cancellingBill)}
        onClose={() => setCancellingBill(null)}
        onConfirm={handleCancelBill}
        title="Cancel Hospital Invoice"
        message={`Are you sure you want to cancel invoice ${cancellingBill?.bill_number} for ${cancellingBill?.patient_name}? The status will be marked as Cancelled for financial auditing.`}
        confirmLabel={actionLoading ? 'Cancelling...' : 'Cancel Invoice'}
        confirmClass="btn-warning"
      />

      {/* Delete Invoice Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingBill)}
        onClose={() => setDeletingBill(null)}
        onConfirm={handleDeleteBill}
        title="Delete Hospital Invoice"
        message={`Are you sure you want to permanently delete invoice ${deletingBill?.bill_number}? All service line items will be removed from PostgreSQL. This action cannot be undone.`}
        confirmLabel={actionLoading ? 'Deleting...' : 'Delete Invoice'}
        confirmClass="btn-critical"
      />
    </div>
  );
}
