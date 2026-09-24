# Student Support & Ticket Management System

## Problem
Students frequently encounter issues related to fees, attendance, ID cards, and certificates. Currently, resolving these issues requires manual visits to staff or multiple follow-up emails, leading to a slow and fragmented experience.

## Solution
This project introduces a centralized support ticket system. Students can log in to create and track tickets, while staff and administrators can manage, assign, and resolve them systematically.

## Features
- **Role-Based Access Control:** Distinct experiences for Students, Staff, and Admins.
- **Ticket Lifecycle Management:** Open, Assigned, In Progress, Pending, Resolved, and Closed states.
- **SLA & Priority Tracking:** Tickets are assigned Service Level Agreements based on Priority (Low, Medium, High, Urgent).
- **Communication:** Built-in commenting system for staff and students to communicate.
- **Activity History:** Full audit trail for status changes and ticket updates.
- **Admin Dashboards:** Advanced metrics for Ticket Ageing and Escalations.
- **Search & Filter:** Find and sort tickets easily.

## Technology Stack
- **Frontend:** React, Vite, Tailwind CSS v4, React Router, Axios
- **Backend:** Django, Django REST Framework, JWT Authentication
- **Database:** PostgreSQL (via Supabase)

## Database Design
The system consists of the following core models:
1. `User` (id, email, name, role)
2. `Ticket` (ticket_number, title, description, category, priority, status, assigned_to, due_at, etc.)
3. `TicketComment` (ticket, user, message)
4. `TicketActivity` (ticket, description, created_at)
5. `Attachment` (ticket, file, uploaded_by)

## API Endpoints
- `POST /api/auth/register/` - Register user
- `POST /api/auth/login/` - JWT login
- `GET /api/auth/me/` - Get current user profile
- `GET /POST /api/tickets/` - List/Create tickets
- `GET /PUT /DELETE /api/tickets/{id}/` - Manage specific ticket
- `POST /api/tickets/{id}/assign/` - Assign staff to ticket (Admin only)
- `POST /api/tickets/{id}/change_status/` - Update ticket status
- `POST /api/tickets/{id}/comment/` - Add a comment

## Ticket Lifecycle
```
OPEN -> ASSIGNED -> IN_PROGRESS -> PENDING -> RESOLVED -> CLOSED
```

## SLA and Ageing
- SLAs are calculated automatically upon ticket creation. 
- Due dates: Low (5 days), Medium (3 days), High (2 days), Urgent (1 day).
- The Admin Dashboard features an ageing report tracking unresolved tickets across multiple time buckets (0-2 Days, 3-5 Days, 6-10 Days, 10+ Days) and identifies escalated (overdue) tickets.

## Edge Cases Handled
1. **Security/Privacy:** Students can only view their own tickets. Staff can only modify their assigned tickets.
2. **Read-only History:** The `TicketActivity` table is strictly append-only.
3. **Graceful Status Changes:** Staff can mark a ticket as Resolved, but Students must confirm and mark it as Closed.
4. **Invalid Transitions:** Prevented via role checks and UI constraints.

## Installation & How to Run

**1. Clone the repository and configure `.env` in the backend:**
```env
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=db.your-supabase-url.supabase.co
DB_PORT=5432
```

**2. Start the Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

**3. Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**4. Test Accounts:**
To test the application quickly, you can log in with:
- **Admin:** `admin@example.com` / `password123`
- **Student:** `student@example.com` / `password123`

## Screenshots
*(Add screenshots of your application here before submission)*

## Future Improvements
- Add email notifications on ticket updates.
- Improve file attachment handling (cloud storage integration).
- Use WebSockets to update the UI in real-time when comments are added.
