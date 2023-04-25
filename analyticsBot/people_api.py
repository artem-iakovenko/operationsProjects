import requests
from config import API_URLS
import json


def prepare_task_data(task_responses):
    task_obj = {
        'Request_s_Direction': 'Analytics/Dashboards',
        'Status': 'Created',
        'Task_Owner': '378942000000189159'
    }
    for val in task_responses.values():
        for k, v in val.items():
            if k == 'task_name':
                task_obj['Short_Title'] = v.get('value')
            elif k == 'priority':
                task_obj['Priority'] = v.get('selected_option').get('value')
            elif k == 'description':
                task_obj['Describe_your_request'] = v.get('value')
            elif k == 'delivery_date':
                task_obj['Expected_Delivery_Date'] = v.get('selected_date')
    return task_obj


def get_access_token():
    response = requests.post(API_URLS.get('people_refresh'))
    return response.json().get('access_token')


def create_task(post_data, access_token):
    headers = {
        'Authorization': f'Zoho-oauthtoken {access_token}'
    }
    response = requests.post(f"{API_URLS.get('people_create_task')}{json.dumps(post_data)}", headers=headers)
    print(response.json())


def people_handler(task, data):
    if task == 'create_task':
        task_post_data = prepare_task_data(data)
        access_token = get_access_token()
        create_task(task_post_data, access_token)
        print(task_post_data)
        print(access_token)
