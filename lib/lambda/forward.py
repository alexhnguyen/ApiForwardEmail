import boto3
import os
import tempfile
import json
from datetime import datetime


def handler(event, context):
    print("Starting lambda")

    try:
        body = json.loads(event['body'])
    except Exception as e:
        print(f"Unable to parse body. ({e})")
        return {
            "statusCode": 400,
            "body": "Please check your request is sending JSON data."
        }

    try:
        send_email()
    except Exception as e:
        print(f"Something went wrong trying to send the email. ({e})")
        print(f"Body of request: {body}")
        return {
            "statusCode": 500,
            "body": "Something went wrong on our side. Please send your message directly to alex991nguyen@gmail.com"
        }

    try:
        upload_to_s3(body)
    except Exception as e:
        print(f"Exception trying to upload to S3. ({e})")
        print(f"Body of request: {body}")
        return {
            "statusCode": 500,
            # email is sent so the logs will be checked
            "body": "Something went wrong on our side. We are investigating and will get back to you."
        }

    print("Exiting lambda")
    return {
            "statusCode": 200,
            "body": "Thank you for your message!"
        }


def upload_to_s3(body):
    s3_bucket = os.environ['BUCKET_NAME']
    s3_client = boto3.client('s3')
    now = datetime.now()
    file_name = str(now)
    with tempfile.NamedTemporaryFile('w') as tempfile_upload:
        json.dump(body, tempfile_upload)
        tempfile_upload.flush()
        s3_client.upload_file(tempfile_upload.name, s3_bucket, file_name)


def send_email():
    topic_arn = os.environ['TOPIC_ARN']
    sns = boto3.client("sns")
    sns.publish(
        TopicArn=topic_arn,
        Subject="Message received",
        Message="A message has been received. Check your S3 bucket."
        )
