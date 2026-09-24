from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from .models import Ticket, TicketComment, TicketActivity, Attachment
from .serializers import (
    TicketSerializer, TicketCreateSerializer,
    TicketCommentSerializer, AttachmentSerializer
)
from .permissions import TicketAccessPermission

# ── Allowed status transitions per role ─────────────────────────────────────
# (from_status, to_status) pairs allowed for each role
STUDENT_TRANSITIONS = {
    ('RESOLVED', 'REOPENED'),
}
STAFF_TRANSITIONS = {
    ('ASSIGNED',    'IN_PROGRESS'),
    ('REOPENED',    'IN_PROGRESS'),
    ('IN_PROGRESS', 'PENDING'),
    ('PENDING',     'IN_PROGRESS'),
    ('IN_PROGRESS', 'RESOLVED'),   # fallback; prefer /resolve/ endpoint
}
# Admin can do any transition; no restriction.


class TicketViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, TicketAccessPermission]

    def get_serializer_class(self):
        if self.action == 'create':
            return TicketCreateSerializer
        return TicketSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Ticket.objects.all().order_by('-created_at')
        elif user.role == 'STAFF':
            return Ticket.objects.filter(assigned_to=user).order_by('-updated_at')
        else:
            return Ticket.objects.filter(created_by=user).order_by('-created_at')

    def perform_create(self, serializer):
        priority = serializer.validated_data.get('priority', 'LOW')
        days = {'LOW': 5, 'MEDIUM': 3, 'HIGH': 2, 'URGENT': 1}.get(priority, 5)
        due_at = timezone.now() + timedelta(days=days)

        ticket = serializer.save(created_by=self.request.user, due_at=due_at)
        TicketActivity.objects.create(
            ticket=ticket,
            description=f"Ticket created by {self.request.user.name}"
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Return full ticket data (with id, ticket_number, due_at, etc.)
        full_serializer = TicketSerializer(serializer.instance)
        return Response(full_serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        old_ticket = self.get_object()
        new_priority = serializer.validated_data.get('priority')

        if new_priority and old_ticket.priority != new_priority:
            if self.request.user.role != 'ADMIN':
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only admins can change ticket priority.")

        ticket = serializer.save()

        if new_priority and old_ticket.priority != new_priority:
            TicketActivity.objects.create(
                ticket=ticket,
                description=f"Admin changed priority\n{old_ticket.priority} → {new_priority}\nReason: Updated via edit"
            )

    # ── Change priority (Admin only) ─────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def change_priority(self, request, pk=None):
        ticket = self.get_object()
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only admins can change priority.'}, status=status.HTTP_403_FORBIDDEN)

        new_priority = request.data.get('priority')
        reason = request.data.get('reason', '').strip()

        if not new_priority or new_priority not in dict(Ticket.PRIORITY_CHOICES):
            return Response({'detail': 'Valid priority is required.'}, status=status.HTTP_400_BAD_REQUEST)

        old_priority = ticket.priority
        if old_priority == new_priority:
            return Response({'detail': 'Priority is already set to this value.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.priority = new_priority
        ticket.save(update_fields=['priority', 'updated_at'])

        desc = f"Admin changed priority\n{old_priority} → {new_priority}"
        if reason:
            desc += f"\nReason: {reason}"
        else:
            desc += f"\nReason: Priority updated by {request.user.name}"

        TicketActivity.objects.create(ticket=ticket, description=desc)
        return Response(TicketSerializer(ticket).data)

    # ── Assign ticket (Admin only) ───────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only admins can assign tickets.'}, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        staff_id = request.data.get('user_id') or request.data.get('staff_id')
        if not staff_id:
            return Response({'detail': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            staff = User.objects.get(pk=staff_id, role='STAFF')
        except User.DoesNotExist:
            return Response({'detail': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        old_staff = ticket.assigned_to
        ticket.assigned_to = staff
        ticket.status = 'ASSIGNED'
        ticket.save()

        desc = f"Ticket assigned to {staff.name}"
        if old_staff and old_staff != staff:
            desc = f"Ticket reassigned from {old_staff.name} to {staff.name}"
        desc += f" by {request.user.name}"

        TicketActivity.objects.create(ticket=ticket, description=desc)
        return Response(TicketSerializer(ticket).data)

    # ── Change status (role-restricted transitions) ──────────────────────────
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        ticket = self.get_object()
        new_status = request.data.get('status', '').upper()
        reason = request.data.get('reason', '').strip()

        if new_status not in dict(Ticket.STATUS_CHOICES):
            return Response({'detail': 'Invalid status value.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = ticket.status
        role = request.user.role
        transition = (old_status, new_status)

        # Enforce transition rules
        if role == 'STUDENT':
            if transition not in STUDENT_TRANSITIONS:
                return Response(
                    {'detail': f'Students cannot move a ticket from {old_status} to {new_status}.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif role == 'STAFF':
            if transition not in STAFF_TRANSITIONS:
                return Response(
                    {'detail': f'Staff cannot move a ticket from {old_status} to {new_status}. Use the resolve endpoint to mark tickets resolved.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        # Admin: any transition allowed

        ticket.status = new_status

        if new_status == 'RESOLVED':
            ticket.resolved_at = timezone.now()
        elif new_status == 'REOPENED':
            ticket.resolved_at = None  # reset resolved timestamp
            ticket.resolution_note = ''

        ticket.save()

        activity_desc = f"Status changed from {old_status} to {new_status} by {request.user.name}"
        if reason:
            activity_desc += f": {reason}"

        TicketActivity.objects.create(ticket=ticket, description=activity_desc)

        # When PENDING with a reason, also log a dedicated message
        if new_status == 'PENDING' and reason:
            TicketActivity.objects.create(
                ticket=ticket,
                description=f"Staff requested information: {reason}"
            )

        return Response(TicketSerializer(ticket).data)

    # ── Resolve (Staff / Admin only) — requires a resolution note ───────────
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        if request.user.role not in ('STAFF', 'ADMIN'):
            return Response({'detail': 'Only staff or admin can resolve tickets.'}, status=status.HTTP_403_FORBIDDEN)

        note = request.data.get('resolution_note', '').strip()
        if not note:
            return Response({'detail': 'A resolution note is required.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_from = {'IN_PROGRESS', 'PENDING', 'ASSIGNED', 'REOPENED'}
        if ticket.status not in valid_from and request.user.role != 'ADMIN':
            return Response(
                {'detail': f'Cannot resolve a ticket with status {ticket.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = ticket.status
        ticket.status = 'RESOLVED'
        ticket.resolved_at = timezone.now()
        ticket.resolution_note = note
        ticket.save(update_fields=['status', 'resolved_at', 'resolution_note', 'updated_at'])

        TicketActivity.objects.create(
            ticket=ticket,
            description=f"Ticket resolved by {request.user.name}"
        )
        TicketActivity.objects.create(
            ticket=ticket,
            description=f"Resolution note: {note}"
        )
        return Response(TicketSerializer(ticket).data)

    # ── Comment ──────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        ticket = self.get_object()
        serializer = TicketCommentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(ticket=ticket, user=request.user)

        role_label = request.user.role.capitalize()
        TicketActivity.objects.create(
            ticket=ticket,
            description=f"Comment added by {request.user.name} ({role_label})"
        )

        # Auto-advance PENDING → IN_PROGRESS when student responds
        if ticket.status == 'PENDING' and request.user.role == 'STUDENT':
            ticket.status = 'IN_PROGRESS'
            ticket.save(update_fields=['status', 'updated_at'])
            TicketActivity.objects.create(
                ticket=ticket,
                description=f"Ticket moved to IN_PROGRESS after student response by {request.user.name}"
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── File attachment ──────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def attach(self, request, pk=None):
        ticket = self.get_object()
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        allowed = ['.pdf', '.jpg', '.jpeg', '.png']
        import os
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in allowed:
            return Response(
                {'detail': f'File type not allowed. Allowed: PDF, JPG, JPEG, PNG.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        attachment = Attachment.objects.create(
            ticket=ticket,
            file=file_obj,
            uploaded_by=request.user
        )

        TicketActivity.objects.create(
            ticket=ticket,
            description=f"File '{file_obj.name}' attached by {request.user.name}"
        )

        # Auto-advance PENDING → IN_PROGRESS when student uploads a document
        if ticket.status == 'PENDING' and request.user.role == 'STUDENT':
            ticket.status = 'IN_PROGRESS'
            ticket.save(update_fields=['status', 'updated_at'])
            TicketActivity.objects.create(
                ticket=ticket,
                description=f"Ticket moved to IN_PROGRESS after student uploaded document"
            )

        return Response(AttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)
