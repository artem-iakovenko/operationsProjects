BOT_TOKEN = 'xoxb-203249045207-5141454445190-TUH2slF1J99LdOKLyEmjjTLo'
SIGNING_SECRET = '7cda7d1fd0c268b90c33ba323005b8fe'
CHANNEL_ID = "C054QLX3HDX"
MONGO_DB = {
    "connection": "mongodb+srv://artemiakovenko:thereal1620@kitrum.nwsnnwp.mongodb.net/?retryWrites=true&w=majority",
    "database": "analyticsbot",
    "collection": "favourites"
}
ZOHO_TOKENS = {
    "client_id": "1000.T5VGK6CRDD7W6W8MO9QPZD6ZIF3TSG",
    "client_secret": "087ee51ba48ed0ce72294457d025eba49db635bb1e",
    "people_refresh": "1000.f688e76299031a2fad11b79ac3e73cec.1d9525c484c8ad95c108878d69dcebe1"
}
API_URLS = {
    "people_refresh": f"https://accounts.zoho.com/oauth/v2/token?refresh_token={ZOHO_TOKENS.get('people_refresh')}&client_id={ZOHO_TOKENS.get('client_id')}&client_secret={ZOHO_TOKENS.get('client_secret')}&grant_type=refresh_token",
    "people_create_task": "https://people.zoho.com/people/api/forms/json/Operations_Team_Task_Tracker/insertRecord?inputData="
}
MESSAGES = {
    "no_favourites": "No records found",
    "favourite_added": "Success) You can find this link in your Favourites",
    "welcome": {
        "text": "How can I help you today?",
        "attachments": [
            {
                "text": "Please find what can I do for you in a dropdown list below",
                "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "callback_id": "menu_selection",
                "actions": [
                    {
                        "name": "menu_options",
                        "text": "Pick an option...",
                        "type": "select",
                        "options": [
                            {
                                "text": "Find a Dashboard/Chart/Report",
                                "value": "find_by_keyword"
                            },
                            {
                                "text": "Recently added Analytics",
                                "value": "recent_analytics"
                            },
                            {
                                "text": "Create a request for Analytics",
                                "value": "request_analytics"
                            },
                            {
                                "text": "Favourites",
                                "value": "favourites"
                            }
                        ]
                    }
                ]
            }
        ]
    }
}
BLOCKS = {
    "api_url": 'https://slack.com/api/dialog.open',
    'blocks': {
        'request_analytics': {
            "title": {
                "type": "plain_text",
                "text": "Create Task",
                "emoji": True
            },
            "submit": {
                "type": "plain_text",
                "text": "Create",
                "emoji": True
            },
            "type": "modal",
            "blocks": [
                {
                    "type": "input",
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "task_name"
                    },
                    "label": {
                        "type": "plain_text",
                        "text": "Task Name",
                        "emoji": True
                    },
                },
                {
                    "type": "input",
                    "element": {
                        "type": "static_select",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select an item",
                            "emoji": True
                        },
                        "options": [
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "As soon as possible ☎️",
                                    "emoji": True
                                },
                                "value": "As soon as possible ☎"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "I have the deadline ⏳",
                                    "emoji": True
                                },
                                "value": "I have the deadline ⏳"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Take your time guys ✅",
                                    "emoji": True
                                },
                                "value": "Take your time guys ✅"
                            }
                        ],
                        "action_id": "priority"
                    },
                    "label": {
                        "type": "plain_text",
                        "text": "Priority",
                        "emoji": True
                    }
                },
                {
                    "type": "input",
                    "element": {
                        "type": "plain_text_input",
                        "multiline": True,
                        "action_id": "description"

                    },
                    "label": {
                        "type": "plain_text",
                        "text": "Task Description",
                        "emoji": True
                    },
                },
                {
                  "type": "input",
                  "element": {
                    "type": "datepicker",
                    "action_id": "delivery_date"
                  },
                  "label": {
                    "type": "plain_text",
                    "text": "Expected Delivery Date"
                  }
                }
            ]
        },
        'addfavourites': {
            "title": {
                "type": "plain_text",
                "text": "Add Favourites",
                "emoji": True
            },
            "submit": {
                "type": "plain_text",
                "text": "Save",
                "emoji": True
            },
            "type": "modal",
            "blocks": [
                {
                  "type": "input",
                  "element": {
                    "type": "url_text_input",
                    "action_id": "favourite_url"
                  },
                  "label": {
                    "type": "plain_text",
                    "text": "URL",
                    "emoji": True
                  }
                },
                {
                    "type": "input",
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "favourite_name"
                    },
                    "label": {
                        "type": "plain_text",
                        "text": "Name",
                        "emoji": True
                    },
                },
                {
                    "type": "input",
                    "element": {
                        "type": "static_select",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select a category",
                            "emoji": True
                        },
                        "options": [
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Reports",
                                    "emoji": True
                                },
                                "value": "Reports"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Charts",
                                    "emoji": True
                                },
                                "value": "Charts"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Dashboards",
                                    "emoji": True
                                },
                                "value": "Dashboards"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Other",
                                    "emoji": True
                                },
                                "value": "Other"
                            },
                        ],
                        "action_id": "category"
                    },
                    "label": {
                        "type": "plain_text",
                        "text": "Category",
                        "emoji": True
                    }
                }
            ]
        },
        'recent_analytics': {

        }
    }
}
