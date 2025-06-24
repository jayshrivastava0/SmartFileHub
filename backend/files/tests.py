from django.test import TestCase, Client
from django.urls import reverse
from .models import File
from django.core.files.uploadedfile import SimpleUploadedFile

class FileAPITestCase(TestCase):
    """
    Test suite for the File API endpoints.

    This class contains tests for the list, upload, and other file-related
    API actions to ensure they behave as expected.
    """
    def setUp(self):
        """
        Set up the test environment before each test.

        This method initializes a test client to make API requests and
        resolves the URL for the file list endpoint. This setup is
        run before every single test method.
        """
        self.client = Client()
        self.list_url = reverse('file-list')

    def tearDown(self):
        """
        Clean up the test environment after each test.

        This method deletes all `File` objects from the database after each test
        to ensure that tests are isolated and do not interfere with each other.
        """
        File.objects.all().delete()

    def test_list_files_empty(self):
        """
        Test that the API returns an empty list when no files are in the database.

        This test makes a GET request to the file list endpoint and asserts that
        it returns a 200 OK status code and an empty JSON list `[]`.
        """
        # Make a GET request to the file list URL.
        response = self.client.get(self.list_url)
        # Assert that the response status code is 200 OK.
        self.assertEqual(response.status_code, 200)
        # Assert that the response body is an empty list.
        self.assertEqual(response.json(), [])

    def test_list_files_with_data(self):
        """
        Test that the API returns a list with file data when files exist.

        This test first creates a new `File` object in the database. It then
        makes a GET request to the file list endpoint and asserts that the
        response contains the data for the created file.
        """
        # Create a mock file in memory to use for the `File` model instance.
        # `SimpleUploadedFile` simulates a file upload without needing a real file.
        dummy_file = SimpleUploadedFile("testfile.txt", b"file_content", content_type="text/plain")

        # Create a `File` object in the test database.
        File.objects.create(
            original_filename='testfile.txt',
            size=1024,
            file=dummy_file,
            file_type='text/plain'
        )

        # Make a GET request to the file list URL.
        response = self.client.get(self.list_url)
        
        # Assert that the response status code is 200 OK.
        self.assertEqual(response.status_code, 200)
        
        # Parse the JSON response.
        response_data = response.json()
        
        # Assert that the response contains exactly one file.
        self.assertEqual(len(response_data), 1)
        # Assert that the filename of the file in the response matches the one we created.
        self.assertEqual(response_data[0]['original_filename'], 'testfile.txt') 