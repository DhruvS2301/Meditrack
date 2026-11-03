// Status badge component — maps status strings to styled badges

const statusMap: Record<string, string> = {
  // Appointments
  'Scheduled': 'badge badge-scheduled',
  'Confirmed': 'badge badge-confirmed',
  'Checked In': 'badge badge-checked-in',
  'In Progress': 'badge badge-in-progress',
  'Completed': 'badge badge-completed',
  'Cancelled': 'badge badge-cancelled',
  'No Show': 'badge badge-no-show',
  // Admissions
  'Active': 'badge badge-active',
  'Discharged': 'badge badge-discharged',
  'Transferred': 'badge badge-no-show',
  // Bills
  'Pending': 'badge badge-pending',
  'Partial': 'badge badge-partial',
  'Paid': 'badge badge-paid',
  'Overdue': 'badge badge-overdue',
  // Beds
  'Available': 'badge badge-available',
  'Occupied': 'badge badge-occupied',
  'Maintenance': 'badge badge-maintenance',
  // Prescriptions
  'Draft': 'badge badge-draft',
  'Finalised': 'badge badge-finalised',
  // Payments
  'Failed': 'badge badge-cancelled',
  'Refunded': 'badge badge-no-show',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const cls = statusMap[status] || 'badge';
  return (
    <span className={`${cls} ${className}`}>
      {status}
    </span>
  );
}
