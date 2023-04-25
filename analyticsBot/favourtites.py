from pymongo import MongoClient
from config import MONGO_DB, MESSAGES


def db_insert_row(row):
    client = MongoClient(MONGO_DB.get('connection'))
    database = client[MONGO_DB.get('database')]
    collection = database[MONGO_DB.get('collection')]
    insert = collection.insert_one(row)
    print(insert)
    client.close()


def parse_responses(responses, slack_id):
    mongo_row = {"slackid": slack_id}
    for val in responses.values():
        for k, v in val.items():
            if k == 'favourite_url':
                mongo_row['url'] = v.get('value')
            if k == 'favourite_name':
                mongo_row['name'] = v.get('value')
            elif k == 'category':
                mongo_row['category'] = v.get('selected_option').get('value')
    return mongo_row


def add_to_favourites(responses, slack_id):
    response_obj = parse_responses(responses, slack_id)
    db_insert_row(response_obj)


def get_message_content(collection_records):
    message = "My Favourites"
    group_dict = {}
    for record in collection_records:
        hyperlink = f'<{record.get("url")}|{record.get("name")}>'
        if record.get("category") in group_dict.keys():
            current_value = group_dict[record.get("category")]
            current_value.append(hyperlink)
        else:
            group_dict[record.get("category")] = [
                hyperlink
            ]
    for category, links in group_dict.items():
        message += f'\n\n*{category}:*'
        for link in links:
            message += f'\n\t{link}'

    return message


def db_get_records(slack_id):
    client = MongoClient(MONGO_DB.get('connection'))
    database = client[MONGO_DB.get('database')]
    collection = database[MONGO_DB.get('collection')]
    found_favourites = collection.find({"slackid": slack_id})
    records_returned = found_favourites.explain().get("executionStats").get("nReturned")
    message_content = get_message_content(found_favourites) if records_returned > 0 else MESSAGES.get("no_favourites")
    return message_content


def get_favourites(slack_id):
    return db_get_records(slack_id)
