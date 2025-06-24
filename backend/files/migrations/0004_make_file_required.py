from django.db import migrations, models

def handle_null_files(apps, schema_editor):
    File = apps.get_model('files', 'File')
    # Delete any files that have null file field
    File.objects.filter(file__isnull=True).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('files', '0003_alter_file_file'),
    ]

    operations = [
        migrations.RunPython(handle_null_files),
        migrations.AlterField(
            model_name='file',
            name='file',
            field=models.FileField(upload_to='uploads/'),
        ),
    ] 