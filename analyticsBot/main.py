import slack
import config
import ssl
import certifi
from flask import Flask, Request, request, Response
from slackeventsapi import SlackEventAdapter
import json
import requests
import analytics_api
import favourtites
import people_api
templates = config.MESSAGES
blocks = config.BLOCKS
ssl_context = ssl.create_default_context(cafile=certifi.where())


app = Flask(__name__)
slack_event_adapter = SlackEventAdapter(config.SIGNING_SECRET, '/slack/events', app)
client = slack.WebClient(token=config.BOT_TOKEN, ssl=ssl_context)
BOT_ID = client.api_call('auth.test')['user_id']


@app.route('/launch', methods=['POST'])
def start():
    data = request.form
    print(data)
    channel_id = data.get('channel_id')
    client.chat_postMessage(
        channel=channel_id, text=templates['welcome']['text'],
        attachments=templates['welcome']['attachments']
    )
    return Response(), 200


@app.route('/addfavourites', methods=['POST'])
def add_favourites():
    data = request.form
    open_block("addfavourites", data.get('trigger_id'), data.get('channel_id'), None)
    return Response(), 200


def open_block(action, trigger_id, channel_id, user_id):
    if action == 'favourites':
        favourites_msg = favourtites.get_favourites(user_id)
        client.chat_postMessage(channel=channel_id, text=favourites_msg)
    else:
        block = blocks.get('blocks').get(action)
        print(block)
        client.views_open(trigger_id=trigger_id, view=json.dumps(block))


def actions_handler(view_name, view_responses, user_id):
    if view_name == 'Create Task':
        people_api.people_handler(task='create_task', data=view_responses)
    elif view_name == 'Add Favourites':
        favourtites.add_to_favourites(view_responses, user_id)
        client.chat_postMessage(channel=config.CHANNEL_ID, text=templates.get('favourite_added'))


@app.route('/actions', methods=['POST'])
def actions():
    data = json.loads(request.form.get('payload'))
    payload_type = data.get('type')
    user_id = data.get('user').get('id')
    if payload_type == 'interactive_message':
        channel_id = data.get('channel').get('id')
        action = data.get('actions')[0].get('selected_options')[0].get('value')
        trigger_id = data.get('trigger_id')
        print(action)
        open_block(action, trigger_id, channel_id, user_id)
    elif payload_type == 'view_submission':
        print('data', data)
        view_name = data.get('view').get('title').get('text')
        view_responses = data.get('view').get('state').get('values')
        actions_handler(view_name, view_responses, user_id)

    return Response(), 200


if __name__ == '__main__':
    app.run(debug=True, port=8000)
