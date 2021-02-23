import requests

response = requests.post(
        "https://gbjlw62792.execute-api.us-west-2.amazonaws.com/prod/",
        headers={
            'Content-type': 'application/json'
        },
        json={
            "name": "Jenny Recruiter",
            "email": "jenny@example.com",
            "message": "www.example.com/your-resume.pdf",
            "phone": "555-867-5309"
        }
    )

if response.status_code != 200:
    print("Something went wrong sending the request.")
else:
    print("Congrats! Your request has sent successfully")
if response.text:
    print(f"Response text: {response.text}")
