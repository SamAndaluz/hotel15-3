# -*- coding: utf-8 -*-

{
    'name': 'Pos Table Reservation',
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'author': 'ErpMstar Solutions',
    'summary': 'This app allows you to reserve the table.',
    'description': "This app allows you to reserve the table.",
    'depends': ['pos_restaurant'],
    'data': [
        'views/views.xml',
        'views/templates.xml'
    ],
    'qweb': [
        'static/src/xml/pos.xml',
    ],
    'images': [
        'static/description/pos_button.jpg',
    ],
    'installable': True,
    'website': '',
    'auto_install': False,
    'price': 49,
    'currency': 'EUR',
}
