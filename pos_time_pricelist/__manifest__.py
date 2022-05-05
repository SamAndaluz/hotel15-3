# -*- coding: utf-8 -*-

{
    'name': 'Pos Time Based Pricelist',
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'author': 'ErpMstar Solutions',
    'summary': "Allows you to create pricelist based on time." ,
    'description': "Allows you to create pricelist based on time.",
    'depends': ['point_of_sale'],
    'data': [
        # 'security/ir.model.access.csv',
        'views/views.xml',
        'views/templates.xml'
    ],
    'qweb': [
        'static/src/xml/pos.xml',
    ],
    'images': [
        'static/description/pricelist.jpg',
    ],
    'installable': True,
    'website': '',
    'auto_install': False,
    'price': 30,
    'currency': 'EUR',
}
