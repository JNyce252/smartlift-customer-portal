// CSV Export Utility — Smarterlift

const downloadCSV = (filename, rows, headers) => {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
  };
  const csv = [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportProspectsCSV = (prospects) => {
  const rows = prospects.map(p => ({
    'Name': p.name,
    'Address': p.address,
    'City': p.city,
    'State': p.state || 'TX',
    'Phone': p.phone,
    'Website': p.website,
    'AI Score': p.ai_score,
    'Status': p.status,
    'Elevators': p.elevator_count,
    'TDLR Records': p.tdlr_count,
    'Floors': p.floors,
    'Reviews': p.review_count,
    'Rating': p.rating,
    'Source': p.source,
    'Added': p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
  }));
  downloadCSV(
    `Smarterlift-Prospects-${new Date().toISOString().split('T')[0]}.csv`,
    rows,
    ['Name','Address','City','State','Phone','Website','AI Score','Status','Elevators','TDLR Records','Floors','Reviews','Rating','Source','Added']
  );
};

export const exportWorkOrdersCSV = (workOrders) => {
  const rows = workOrders.map(wo => ({
    'Ticket Number': wo.ticket_number,
    'Title': wo.title,
    'Customer': wo.customer_name,
    'Assigned Technician': wo.assigned_technician,
    'Priority': wo.priority,
    'Status': wo.status,
    'Scheduled Date': wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString() : '',
    'Completed Date': wo.completed_date ? new Date(wo.completed_date).toLocaleDateString() : '',
    'Description': wo.description,
    'Work Performed': wo.work_performed,
    'Cost': wo.cost ? '$' + parseFloat(wo.cost).toFixed(2) : '',
    'Created': wo.created_at ? new Date(wo.created_at).toLocaleDateString() : '',
  }));
  downloadCSV(
    `Smarterlift-WorkOrders-${new Date().toISOString().split('T')[0]}.csv`,
    rows,
    ['Ticket Number','Title','Customer','Assigned Technician','Priority','Status','Scheduled Date','Completed Date','Description','Work Performed','Cost','Created']
  );
};

export const exportInvoicesCSV = (invoices) => {
  const rows = invoices.map(inv => ({
    'Invoice Number': inv.invoice_number,
    'Customer': inv.customer_name,
    'Status': inv.status,
    'Amount': parseFloat(inv.amount || 0).toFixed(2),
    'Tax': parseFloat(inv.tax || 0).toFixed(2),
    'Total': parseFloat(inv.total || 0).toFixed(2),
    'Due Date': inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '',
    'Paid Date': inv.paid_date ? new Date(inv.paid_date).toLocaleDateString() : '',
    'Notes': inv.notes,
    'Created': inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '',
  }));
  downloadCSV(
    `Smarterlift-Invoices-${new Date().toISOString().split('T')[0]}.csv`,
    rows,
    ['Invoice Number','Customer','Status','Amount','Tax','Total','Due Date','Paid Date','Notes','Created']
  );
};

export const exportMaintenanceCSV = (records) => {
  const rows = records.map(m => ({
    'Elevator': m.elevator_identifier,
    'Customer': m.customer_name,
    'Service Type': m.service_type,
    'Technician': m.technician_name,
    'Service Date': m.service_date ? new Date(m.service_date).toLocaleDateString() : '',
    'Next Service': m.next_service_date ? new Date(m.next_service_date).toLocaleDateString() : '',
    'Work Performed': m.work_performed,
    'Parts Replaced': m.parts_replaced,
    'Cost': m.cost ? '$' + parseFloat(m.cost).toFixed(2) : '',
  }));
  downloadCSV(
    `Smarterlift-Maintenance-${new Date().toISOString().split('T')[0]}.csv`,
    rows,
    ['Elevator','Customer','Service Type','Technician','Service Date','Next Service','Work Performed','Parts Replaced','Cost']
  );
};

export const exportEquipmentCSV = (equipment) => {
  const rows = equipment.map(e => ({
    'Elevator ID': e.elevator_identifier,
    'Customer': e.customer_name,
    'Manufacturer': e.manufacturer,
    'Model': e.model,
    'Serial Number': e.serial_number,
    'Install Date': e.install_date ? new Date(e.install_date).toLocaleDateString() : '',
    'Age (Years)': e.age_years,
    'Capacity (lbs)': e.capacity_lbs,
    'Floors': e.floors_served,
    'Status': e.status,
    'Risk Score': e.risk_score,
    'TDLR Certificate': e.tdlr_certificate_number,
    'Last Inspection': e.last_inspection_date ? new Date(e.last_inspection_date).toLocaleDateString() : '',
    'Next Inspection': e.next_inspection_date ? new Date(e.next_inspection_date).toLocaleDateString() : '',
    'Modernization Needed': e.modernization_needed ? 'Yes' : 'No',
    'Total Services': e.total_services,
    'Total Maintenance Cost': e.total_maintenance_cost ? '$' + parseFloat(e.total_maintenance_cost).toFixed(2) : '',
  }));
  downloadCSV(
    `Smarterlift-Equipment-${new Date().toISOString().split('T')[0]}.csv`,
    rows,
    ['Elevator ID','Customer','Manufacturer','Model','Serial Number','Install Date','Age (Years)','Capacity (lbs)','Floors','Status','Risk Score','TDLR Certificate','Last Inspection','Next Inspection','Modernization Needed','Total Services','Total Maintenance Cost']
  );
};
