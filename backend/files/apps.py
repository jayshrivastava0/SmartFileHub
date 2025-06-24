from django.apps import AppConfig

class FilesConfig(AppConfig):
  """
  Configuration class for the 'files' Django app.
  This class is used by Django to configure the application,
  such as setting the default primary key type.
  """
  # Sets the default primary key field type for models in this app
  # to BigAutoField, which is a 64-bit integer.
  default_auto_field = "django.db.models.BigAutoField"
  
  # The name of the application.
  name = "files"