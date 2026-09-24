from rest_framework import serializers
from .models import Ticket, TicketComment, TicketActivity, Attachment
from accounts.serializers import UserSerializer

class TicketCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = TicketComment
        fields = '__all__'
        read_only_fields = ('user', 'ticket', 'created_at')

class TicketActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketActivity
        fields = '__all__'

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'ticket', 'created_at')

class TicketSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    comments = TicketCommentSerializer(many=True, read_only=True)
    activities = TicketActivitySerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ('ticket_number', 'created_by', 'assigned_to', 'created_at', 'updated_at', 'resolved_at', 'closed_at', 'status', 'due_at', 'resolution_note')

class TicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ('title', 'description', 'category', 'priority')
