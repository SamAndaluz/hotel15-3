# -*- coding: utf-8 -*-

{
    'name': 'Pos Time Based Product',
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'author': 'ErpMstar Solutions',
    'summary': 'Allows you to set timer on product.',
    'depends': ['point_of_sale'],
    'data': [
        # 'security/ir.model.access.csv',
        'views/view.xml',
        # 'views/templates.xml',
    ],    
    'assets': {
        'point_of_sale.assets': [
            'pos_time_based_product/static/src/js/pos.js',
        ],
        'web.assets_qweb': [
            'pos_time_based_product/static/src/xml/**/*',
        ],
    },
    'images': [
        'static/description/pos.jpg',
    ],
    'installable': True,
    'website': '',
    'auto_install': False,
    'price': 30,
    'currency': 'EUR',
    'bootstrap': True,
}
