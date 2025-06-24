import os
import hashlib
from django.conf import settings
from .models import File

def calculate_file_hash(file_path):
    """
    Calculate the SHA-256 hash of a file.

    This function reads the file in chunks to efficiently handle large files
    without consuming too much memory.

    Args:
        file_path (str): The absolute path to the file.

    Returns:
        str: The hexadecimal SHA-256 hash of the file.
    """
    # Initialize the SHA-256 hash object.
    sha256_hash = hashlib.sha256()
    
    # Open the file in binary read mode.
    with open(file_path, "rb") as f:
        # Read the file in 4KB chunks and update the hash.
        # This is memory-efficient for large files.
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
            
    # Return the hexadecimal representation of the hash.
    return sha256_hash.hexdigest()

def check_duplicate_file(uploaded_file):
    """
    Check if an uploaded file is a duplicate of an existing file in the database.

    The check is performed in two steps for efficiency:
    1. Filter existing files by the exact same size.
    2. If potential duplicates are found, calculate and compare file hashes.

    Args:
        uploaded_file (InMemoryUploadedFile or TemporaryUploadedFile): The file object from the request.

    Returns:
        tuple: A tuple containing (is_duplicate, duplicate_file_id, status_message).
               - is_duplicate (bool): True if a duplicate is found, False otherwise.
               - duplicate_file_id (UUID or None): The ID of the original file if a duplicate is found.
               - status_message (str): "DUPLICATE" or "OK".
    """
    # First, perform a quick check by filtering files with the same size.
    # This is a fast initial check that avoids hash calculations if no files of the same size exist.
    existing_files = File.objects.filter(size=uploaded_file.size)
    
    # If no files with the same size exist, it's definitely not a duplicate.
    if not existing_files.exists():
        return False, None, "OK"
    
    # If potential duplicates exist, we need to compare content by hashing.
    # Create a temporary path to save the uploaded file for hashing.
    temp_path = os.path.join(settings.MEDIA_ROOT, 'temp', uploaded_file.name)
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    # Write the uploaded file to the temporary location.
    with open(temp_path, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
    
    # Calculate the hash of the newly uploaded file.
    uploaded_hash = calculate_file_hash(temp_path)
    
    # Clean up by removing the temporary file.
    os.remove(temp_path)
    
    # Now, compare the hash of the uploaded file with the hashes of existing files of the same size.
    for existing_file in existing_files:
        existing_path = existing_file.file.path
        # Ensure the physical file still exists on the disk.
        if os.path.exists(existing_path):
            # Calculate the hash of the existing file.
            existing_hash = calculate_file_hash(existing_path)
            # If hashes match, we've found a duplicate.
            if existing_hash == uploaded_hash:
                return True, existing_file.id, "DUPLICATE"
    
    # If no hash match was found, the file is unique.
    return False, None, "OK"

def get_file_status(file_id):
    """
    Get the current status of a file by its ID.

    Args:
        file_id (UUID): The primary key of the file to check.

    Returns:
        dict: A dictionary containing the file's status and details.
    """
    try:
        # Attempt to retrieve the file object from the database.
        file_obj = File.objects.get(id=file_id)
        return {
            'status': 'OK',
            'file_id': str(file_obj.id),
            'original_filename': file_obj.original_filename
        }
    except File.DoesNotExist:
        # Handle the case where the file does not exist.
        return {
            'status': 'ERROR',
            'message': 'File not found'
        }