import time
import json
import math
import config
import requests as req
from pathlib import Path
from google.oauth2 import service_account
from googleapiclient.discovery import build
from random import randint

requests = Path('./session/creds/results.har').read_text(encoding="utf-8")
cookie = Path('./session/creds/cookie.txt').read_text(encoding="utf-8")

relevant_headers = ['Content-Type', 'Refer', 'User-Agent', 'user', 'x-ziaccesstoken', 'x-ziid', 'x-zisession']


CREDS = service_account.Credentials.from_service_account_file(
    'keys.json', scopes=config.SCOPES
)
SERVICE = build('sheets', 'v4', credentials=CREDS)
sheet = SERVICE.spreadsheets()


def find_request():
    json_obj = json.loads(requests)
    entities = json_obj.get('log').get('entries')
    searches = []
    for entry in entities:
        request_url = entry.get('request').get('url')
        request_method = entry.get('request').get('method')
        if request_method == 'POST' and request_url == 'https://app.zoominfo.com/anura/zoominfo/hPeopleSearch':
            # return entry.get('request')
            searches.append(entry.get('request'))
    return searches if len(searches) > 0 else None


def get_credentials(data):
    post_data = data.get('postData').get('text')
    headers = data.get('headers')
    headers_dict = dict()
    for header in headers:
        if header.get('name') in relevant_headers:
            headers_dict[header.get('name')] = header.get('value')
    headers_dict['Cookie'] = cookie
    return [post_data, headers_dict]


def request_page(post_data, headers):
    s = req.session()
    response = s.post(config.REQUEST_URL, headers=headers, data=json.dumps(post_data))
    print(f'Response Status Code: {response.status_code}')
    if response.status_code == 200:
        return response.json()
    else:
        return None


def data_parser(contacts, search_name):
    p_data = []
    for contact in contacts:
        # CONTACT INFO
        full_name = contact.get('name')
        title = contact.get('title')
        job_title = contact.get('jobTitle')
        linkedin = ''
        try:
            social_links = contact.get('socialUrls').get('socialMedia')
            for social_link in social_links:
                if social_link.get('socialNetworkType') == 'linkedin.com':
                    linkedin = social_link.get('socialNetworkUrl')
        except AttributeError:
            pass

        first_name = contact.get('firstName')
        last_name = contact.get('lastName')
        location = contact.get('location')

        try:
            city = location.get('City')
        except AttributeError:
            city = ''
        try:
            state = location.get('State')
        except AttributeError:
            state = ''
        try:
            country = location.get('CountryCode')
        except AttributeError:
            country = ''

        confidence_score = contact.get('confidenceScore')

        # COMPANY INFO
        company_name = contact.get('companyName')
        company_size_exact = contact.get('companyEmployees')
        company_size_range = contact.get('companyEmployeeCountRange')
        company_revenue_exact = contact.get('companyRevenue')
        company_revenue_range = contact.get('companyRevenueRange')
        company_domain = contact.get('companyDomain')
        try:
            company_website = (contact.get('website')).replace('www.', '')
        except AttributeError:
            company_website = ''
        company_address = contact.get('companyAddress')
        try:
            company_city = company_address.get('City')
        except AttributeError:
            company_city = ''
        try:
            company_state = company_address.get('State')
        except AttributeError:
            company_state = ''
        try:
            company_country = company_address.get('CountryCode')
        except AttributeError:
            company_country = ''

        company_description = contact.get('companyDescription')
        company_type = contact.get('companyType')
        try:
            company_industries = ', '.join(contact.get('topLevelIndustry'))
        except TypeError:
            company_industries = ''
        try:
            company_subindusties = contact.get('doziIndustry')
            subindustries_list = []
            for subindustry in company_subindusties:
                try:
                    subindustries_list.append(subindustry.get('displayName'))
                except AttributeError:
                    pass
            company_subindustries = ', '.join(subindustries_list)
        except TypeError:
            company_subindustries = ''

        creation_time = contact.get('creationDate')

        p_data.append([
            full_name,
            first_name,
            last_name,
            title,
            linkedin,
            city,
            state,
            country,
            confidence_score,
            company_name,
            company_size_exact,
            company_size_range,
            company_revenue_exact,
            company_revenue_range,
            company_website,
            company_city,
            company_state,
            company_country,
            company_industries,
            company_subindustries,
            company_type,
            creation_time,
            search_name
        ])
        # print(f'\tContact: {full_name}, {title} at {company_name}')
    return p_data


def update_spreadsheets(data):
    sheet_data = sheet.values().get(spreadsheetId=config.SPREADSHEET_ID, range=f'{config.USER_EMAIL}!A1:A').execute()
    total_rows = len(sheet_data.get('values'))
    update_sheets = sheet.values().update(spreadsheetId=config.SPREADSHEET_ID, range=f'{config.USER_EMAIL}!A{total_rows+1}',
                                          valueInputOption='USER_ENTERED', body={'values': data}).execute()


def main():
    search_requests = find_request()
    if search_requests is None:
        print('No Searches Available..')
        return
    print(f'Zoominfo Account: {config.USER_FULLNAME}')
    print(f'Total Searches Available: {len(search_requests)}')
    print('====================================================================================================================')

    s = 1
    for search_request in search_requests:
        search_id = randint(100000, 999999)
        # print(f'Search ID {search_id}')
        session_credentials = get_credentials(search_request)
        post_data = json.loads(session_credentials[0])
        headers = session_credentials[1]
        connection_test = request_page(post_data, headers)
        if connection_test is not None:
            print('Connection Test: Success')
            total_contacts = connection_test.get('maxResults')
            total_pages = math.ceil(total_contacts / 25)
            if total_pages >= 100:
                total_pages = 100
            print(f'''Search Details:
            Total Contacts: {total_contacts}
            Total Pages: {total_pages}
====================================================================================================================''')
            start_page = 1
            for i in range(start_page, total_pages + 1):
            #for i in range(start_page, 3):
                print(f'Current Search: {s} of {len(search_requests)}')
                print(f'Current Page: {i} of {total_pages}')
                post_data['page'] = i
                page_data = request_page(post_data, headers)
                parsed_data = data_parser(page_data.get('data'), search_id)
                update_spreadsheets(parsed_data)
                print(f'\nStatus: Google Sheets has been updated')
                print('====================================================================================================================')
                time.sleep(30)
        time.sleep(30)
        s += 1
    print('Status: Completed!')


if __name__ == '__main__':
    print("================================================= Zoominfo Grabber =================================================")
    main()

