from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import File, get_total_saving_size
from .serializers import FileSerializer
from .duplicate_checker import check_duplicate_file, get_file_status
from rest_framework.filters import SearchFilter
from django.http import HttpResponse
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, filters
import datetime
from django.utils import timezone

# Define a custom filter set for the File model to enable advanced filtering.
class FileFilter(FilterSet):
    """
    Custom filter class for the File model.
    
    Provides filtering capabilities for file type, size range (in KB),
    and upload date range.
    """
    # Filter for file size greater than or equal to a value in KB.
    min_size = filters.NumberFilter(field_name='size', method='filter_by_min_size_kb', label='Min Size (KB)')
    # Filter for file size less than or equal to a value in KB.
    max_size = filters.NumberFilter(field_name='size', method='filter_by_max_size_kb', label='Max Size (KB)')
    # Case-insensitive filter for file type.
    file_type = filters.CharFilter(field_name="file_type", lookup_expr="iexact")
    # Date filters are handled in the overridden filter_queryset method for more control.
    min_uploaded_at = filters.DateFilter(field_name="uploaded_at", lookup_expr="gte")
    max_uploaded_at = filters.DateFilter(field_name="uploaded_at", lookup_expr="lte")

    def filter_by_min_size_kb(self, queryset, name, value):
        """Custom method to filter by minimum size, converting KB to bytes."""
        try:
            size_in_bytes = int(value) * 1024
            return queryset.filter(size__gte=size_in_bytes)
        except (ValueError, TypeError):
            return queryset # Ignore invalid filter values

    def filter_by_max_size_kb(self, queryset, name, value):
        """Custom method to filter by maximum size, converting KB to bytes."""
        try:
            size_in_bytes = int(value) * 1024
            return queryset.filter(size__lte=size_in_bytes)
        except (ValueError, TypeError):
            return queryset # Ignore invalid filter values

    def filter_queryset(self, queryset):
        """
        Overrides the default filter_queryset to handle date ranges correctly.
        
        This ensures that date filters are inclusive and timezone-aware.
        'min_uploaded_at' is set to the beginning of the day.
        'max_uploaded_at' is set to the end of the day.
        """
        data = self.data.copy()
        if 'min_uploaded_at' in data and data['min_uploaded_at']:
            try:
                min_date = datetime.datetime.strptime(data['min_uploaded_at'], "%Y-%m-%d")
                # Set time to the start of the day.
                min_date = min_date.replace(hour=0, minute=0, second=0, microsecond=0)
                # Make the datetime object timezone-aware if it's naive.
                if timezone.is_naive(min_date):
                    min_date = timezone.make_aware(min_date)
                queryset = queryset.filter(uploaded_at__gte=min_date)
            except Exception:
                pass # Ignore invalid date formats
        if 'max_uploaded_at' in data and data['max_uploaded_at']:
            try:
                max_date = datetime.datetime.strptime(data['max_uploaded_at'], "%Y-%m-%d")
                # Set time to the end of the day for an inclusive range.
                max_date = max_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                # Make the datetime object timezone-aware.
                if timezone.is_naive(max_date):
                    max_date = timezone.make_aware(max_date)
                queryset = queryset.filter(uploaded_at__lte=max_date)
            except Exception:
                pass # Ignore invalid date formats
        # Apply other filters from the parent class.
        return super().filter_queryset(queryset)

    class Meta:
        model = File
        # Define the fields available for filtering.
        fields = ["file_type", "min_size", "max_size", "min_uploaded_at", "max_uploaded_at"]

class FileViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows files to be viewed, created, or deleted.
    
    Implements file deduplication on upload and provides search and filtering.
    """
    # The base queryset that retrieves all File objects.
    queryset = File.objects.all()
    # The serializer class to use for this viewset.
    serializer_class = FileSerializer
    # The filter backends to use for searching and filtering.
    filter_backends = [DjangoFilterBackend, SearchFilter]
    # The custom filter class to use with DjangoFilterBackend.
    filterset_class = FileFilter
    # The fields to search against with SearchFilter. '^' indicates a starts-with search.
    search_fields = ['^original_filename']

    def create(self, request, *args, **kwargs):
        """
        Handles file uploads, checks for duplicates, and saves the file record.
        
        If the file is a duplicate, it creates a reference to the original file
        instead of saving a new one, and returns a 409 Conflict status.
        Otherwise, it saves the new file and returns a 201 Created status.
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if the uploaded file is a duplicate.
        is_duplicate, duplicate_id, status_msg = check_duplicate_file(file_obj)
        
        # Prepare the data for the serializer.
        data = {
            'original_filename': file_obj.name,
            'file_type': file_obj.content_type,
            'size': file_obj.size
        }
        
        if is_duplicate:
            # If it's a duplicate, reference the original file's record and physical file.
            original_file = File.objects.get(id=duplicate_id)
            data['original_file'] = original_file.id # Pass the ID to the serializer
            data['file'] = original_file.file  # Use the same file path as the original
        else:
            # If it's a new file, use the uploaded file object.
            data['file'] = file_obj
        
        # Validate and save the data using the serializer.
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        response_data = serializer.data
        if is_duplicate:
            # For duplicates, return a 409 Conflict response with details.
            response_data['status'] = 'DUPLICATE'
            response_data['original_file_id'] = str(duplicate_id)
            headers = self.get_success_headers(serializer.data)
            return Response(response_data, status=status.HTTP_409_CONFLICT, headers=headers)
        
        # For new files, return a 201 Created response.
        headers = self.get_success_headers(serializer.data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Custom action to download a specific file."""
        try:
            file_instance = self.get_object()
            file_handle = file_instance.file
            # Create an HTTP response that serves the file for download.
            response = HttpResponse(file_handle.read(), content_type=file_instance.file_type)
            response['Content-Disposition'] = f'attachment; filename="{file_instance.original_filename}"'
            return response
        except File.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def get_file_status(self, request, pk=None):
        """Custom action to get the status of a specific file."""
        status_info = get_file_status(pk)
        return Response(status_info)

    @action(detail=False, methods=['get'])
    def total_saving_size(self, request):
        """Custom action to get the total storage saved by deduplication."""
        total = get_total_saving_size()
        return Response(total)

    def list(self, request, *args, **kwargs):
        """
        Overrides the default list action to handle filtering and pagination.
        
        Also provides a custom message if the filtered query returns no results.
        """
        # Apply search and filter backends to the queryset.
        queryset = self.filter_queryset(self.get_queryset())
            
        # Paginate the results if pagination is configured.
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        # If not paginated, serialize the entire queryset.
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)