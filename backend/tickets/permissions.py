from rest_framework import permissions

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'STUDENT'

class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'STAFF'

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'

class TicketAccessPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'STAFF':
            # Assuming staff can see any ticket, or only assigned ones?
            # The spec says: "Staff Can see assigned tickets" but sometimes they need to see open ones to be assigned.
            # Let's restrict modification to assigned, but view to assigned or open? 
            # Or perhaps they can view all, but only modify assigned.
            if request.method in permissions.SAFE_METHODS:
                return True
            return obj.assigned_to == request.user
        if request.user.role == 'STUDENT':
            return obj.created_by == request.user
        return False
