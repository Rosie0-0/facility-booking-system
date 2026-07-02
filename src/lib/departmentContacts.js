// Per-department contact info shown on each facility's booking page.
// Fill in the "TBC" values with the real person-in-charge details.
export const DEPARTMENT_CONTACTS = {
  library: {
    department: 'Library',
    level:      'Level 6',
    pic:        'Mr. Chan',
    tel:        '0123456789',
    email:      'library@campus.edu.my',
  },
  student_affairs: {
    department: 'Student Affairs Office',
    level:      'Level 1',
    pic:        'Ms. Tan',
    tel:        '0123456789',
    email:      'studentaffairs@campus.edu.my',
  },
  afm: {
    department: 'Admin & Facilities Management (AFM)',
    level:      'Level 2',
    pic:        'Ms.Lim',
    tel:        '0123456789',
    email:      'afm@campus.edu.my',
  },
}

export function getDepartmentContact(department) {
  return DEPARTMENT_CONTACTS[department] || null
}
