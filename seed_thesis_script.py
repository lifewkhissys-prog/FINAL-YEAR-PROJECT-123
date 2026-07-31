import requests
import os

BASE_URL = "http://127.0.0.1:8000/api"

def main():
    print("Seeding sample thesis submissions...")
    
    # Check for test thesis file
    filename = "test_thesis.docx"
    if not os.path.exists(filename):
        filename = "Critical_Assessment_Elvis_Atiah_Thesis.docx"
    
    if not os.path.exists(filename):
        print(f"Error: Neither test_thesis.docx nor Critical_Assessment_Elvis_Atiah_Thesis.docx found.")
        return
        
    print(f"Using thesis file: {filename}")
    
    # 1. Upload Thesis
    url = f"{BASE_URL}/submissions"
    data = {
        "student_name": "Elvis Atiah",
        "title": "Rubric-Grounded Multi-Agent System for Thesis Assessment",
        "degree_level": "mphil",
        "programme": "Computer Engineering",
        "institution": "KNUST"
    }
    
    with open(filename, "rb") as f:
        files = {"file": (filename, f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        res = requests.post(url, data=data, files=files)
        
    if res.status_code != 200:
        print(f"Failed to upload: {res.status_code} - {res.text}")
        return
        
    sub_info = res.json()
    sub_id = sub_info["id"]
    print(f"Thesis uploaded successfully! Submission ID: {sub_id}")
    
    # 2. Trigger Assessment
    assess_url = f"{BASE_URL}/submissions/{sub_id}/assess"
    res_assess = requests.post(assess_url)
    if res_assess.status_code == 200:
        print("Successfully triggered multi-agent assessment pipeline!")
    else:
        print(f"Failed to trigger assessment: {res_assess.status_code} - {res_assess.text}")

if __name__ == "__main__":
    main()
