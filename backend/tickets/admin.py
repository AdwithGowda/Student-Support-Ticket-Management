from django.contrib import admin
from .models import Ticket, TicketComment, TicketActivity, Attachment

class TicketCommentInline(admin.TabularInline):
    model = TicketComment
    extra = 0

class TicketActivityInline(admin.TabularInline):
    model = TicketActivity
    extra = 0
    readonly_fields = ('created_at', 'description')

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'title', 'category', 'priority', 'status', 'created_by', 'assigned_to', 'created_at')
    list_filter = ('status', 'priority', 'category')
    search_fields = ('ticket_number', 'title', 'description', 'created_by__email')
    inlines = [TicketCommentInline, TicketActivityInline]

@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'user', 'created_at')
    search_fields = ('ticket__ticket_number', 'user__email', 'message')

@admin.register(TicketActivity)
class TicketActivityAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'description', 'created_at')
    search_fields = ('ticket__ticket_number', 'description')

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'uploaded_by', 'created_at')
