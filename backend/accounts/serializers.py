from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    active_tickets_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'role', 'password', 'student_id', 'phone_number', 'department', 'course', 'year', 'is_active', 'active_tickets_count')
        extra_kwargs = {'password': {'write_only': True}}

    def get_active_tickets_count(self, obj):
        if obj.role == 'STAFF':
            return obj.assigned_tickets.exclude(status='RESOLVED').count()
        return 0

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data['username'] = validated_data['email']
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user
