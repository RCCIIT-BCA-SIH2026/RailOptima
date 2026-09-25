export const USER_ROLES = [
  {
    id: "admin",
    key: "admin",
    role: "ADMIN",
    canonical_role: "ADMIN",
    systemRole: "Admin",
    department: "ALL",
    departmentName: "Central Operations / All Departments",
    name: "System Administrator",
    label: "1. ADMIN",
    title: "Central Administrator",
    username: "admin",
    user: "admin",
    password: "Admin@123",
    pass: "Admin@123",
    color: "bg-rose-600",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    description: "Full system administration across all departments, settings, and audit logs."
  },
  {
    id: "engineering",
    key: "engineering",
    role: "ENGINEERING",
    canonical_role: "ENGINEERING",
    systemRole: "Sr_DEN",
    department: "ENG",
    departmentName: "Civil Engineering / Permanent Way (P-Way)",
    name: "Engineering Officer (Sr. DEN)",
    label: "2. ENGINEERING",
    title: "Civil / Track Maintenance",
    username: "engineering_officer",
    user: "engineering_officer",
    password: "Eng@123",
    pass: "Eng@123",
    color: "bg-emerald-600",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    description: "Access strictly isolated to Civil track maintenance, USFD rail defects, and P-Way assets."
  },
  {
    id: "trd",
    key: "trd",
    role: "TRD",
    canonical_role: "TRD",
    systemRole: "Sr_DEE",
    department: "TRD",
    departmentName: "Traction Distribution / Electrical (OHE)",
    name: "Traction Officer (Sr. DEE)",
    label: "3. TRD",
    title: "Traction / 25kV OHE",
    username: "traction_officer",
    user: "traction_officer",
    password: "Trd@123",
    pass: "Trd@123",
    color: "bg-cyan-600",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    description: "Access strictly isolated to 25kV OHE catenary, power switching, and traction assets."
  },
  {
    id: "snt",
    key: "snt",
    role: "S&T",
    canonical_role: "S&T",
    systemRole: "Sr_DSTE",
    department: "SNT",
    departmentName: "Signal & Telecommunication",
    name: "Signal Officer (Sr. DSTE)",
    label: "4. S&T",
    title: "Signal & Telecom",
    username: "signal_officer",
    user: "signal_officer",
    password: "Signal@123",
    pass: "Signal@123",
    color: "bg-amber-600",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    description: "Access strictly isolated to point machines, electronic interlocking, and signals."
  },
  {
    id: "control_office",
    key: "control_office",
    role: "CONTROL_OFFICE",
    canonical_role: "CONTROL_OFFICE",
    systemRole: "Sr_DOM",
    department: "OPT",
    departmentName: "Operating / Traffic Control Office",
    name: "Control Office (Sr. DOM)",
    label: "5. CONTROL_OFFICE",
    title: "Operations & Timetabling",
    username: "control_office",
    user: "control_office",
    password: "Opt@123",
    pass: "Opt@123",
    color: "bg-blue-600",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    description: "Train timetabling, freight forecasting, corridor availability, and traffic coordination."
  },
  {
    id: "drm",
    key: "drm",
    role: "DRM",
    canonical_role: "DRM",
    systemRole: "DRM",
    department: "OPT",
    departmentName: "Divisional Operations / Executive",
    name: "Divisional Railway Manager (DRM)",
    label: "6. DRM",
    title: "Executive Approving Authority",
    username: "drm",
    user: "drm",
    password: "Drm@123",
    pass: "Drm@123",
    color: "bg-purple-600",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    description: "Executive sanction authority, reviewing block proposals, safety margins, and punctuality."
  }
];

// Helper index map for constant-time lookup by ID, canonical role, system role, or username
export const USER_ROLES_MAP = USER_ROLES.reduce((acc, r) => {
  acc[r.id] = r;
  acc[r.role] = r;
  acc[r.canonical_role] = r;
  acc[r.systemRole] = r;
  acc[r.username] = r;
  return acc;
}, {});

export function getRoleDefinition(roleOrUsername) {
  if (!roleOrUsername) return USER_ROLES[0];
  const query = String(roleOrUsername).toUpperCase();
  for (const r of USER_ROLES) {
    if (
      r.id.toUpperCase() === query ||
      r.role.toUpperCase() === query ||
      (r.canonical_role && r.canonical_role.toUpperCase() === query) ||
      r.systemRole.toUpperCase() === query ||
      r.username.toUpperCase() === query
    ) {
      return r;
    }
  }
  return USER_ROLES[0];
}

export function isRouteAllowed(path, role) {
  const norm = String(role || 'DRM').toUpperCase().replace(' ', '_');
  if (norm === 'ADMIN' || norm === 'ADMINISTRATOR') return true;

  switch (path) {
    case '/dashboard':
    case '/whatsapp-dispatcher':
    case '/alerts':
    case '/reports':
    case '/blocks':
    case '/block-planning':
    case '/optimization-studio':
    case '/department-coordination':
    case '/corridor-map':
    case '/integrations':
    case '/weekly-planner':
      return true;

    case '/maintenance':
    case '/defects':
    case '/assets':
    case '/resources':
      return ['ENGINEERING', 'TRD', 'S&T', 'SR_DEN', 'SR_DEE', 'SR_DSTE', 'SUPERVISOR', 'ADMIN', 'DRM', 'CONTROL_OFFICE', 'SR_DOM'].includes(norm);

    case '/trains':
    case '/ai-planning':
    case '/what-if':
      return ['CONTROL_OFFICE', 'DRM', 'SR_DOM', 'ADMIN'].includes(norm);

    case '/approvals':
      return ['DRM', 'CONTROL_OFFICE', 'SR_DOM', 'ADMIN', 'ENGINEERING', 'TRD', 'S&T', 'SR_DEN', 'SR_DEE', 'SR_DSTE'].includes(norm);

    case '/settings':
    case '/ai-review':
    case '/audit-logs':
      return ['ADMIN', 'ADMINISTRATOR', 'DRM'].includes(norm);

    default:
      return true;
  }
}
