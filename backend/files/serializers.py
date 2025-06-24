from rest_framework import serializers
from .models import File

class FileSerializer(serializers.ModelSerializer):
    """
    Serializer for the File model.

    This class defines how File model instances are converted to and from
    JSON representations for the API. It also includes custom fields
    to provide additional information, like the deduplication status.
    """
    # A read-only field to expose the ID of the original file if this is a duplicate.
    # It sources its value from the 'id' attribute of the 'original_file' related object.
    original_file_id = serializers.UUIDField(source='original_file.id', read_only=True)
    
    # A custom method field to determine the status ('OK' or 'DUPLICATE') of the file.
    status = serializers.SerializerMethodField()

    class Meta:
        model = File
        # Fields to include in the serialized output.
        fields = ['id', 'file', 'original_filename', 'file_type', 'size', 'uploaded_at', 'original_file_id', 'status']
        # Fields that should not be writable via the API.
        read_only_fields = ['id', 'uploaded_at', 'original_file_id', 'status']

    def get_status(self, obj):
        """
        Determines the file's status based on the 'original_file' field.

        Args:
            obj (File): The File instance being serialized.

        Returns:
            str: 'DUPLICATE' if the file is a duplicate, 'OK' otherwise.
        """
        return 'DUPLICATE' if obj.original_file else 'OK'