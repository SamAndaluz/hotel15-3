# -*- coding: utf-8 -*-
{
    'name': "POS Order Time",

    'summary': """
       Create new pos order time.""",

    'description': """
       Create new pos order time""",

    'author': "ITLighent",
    'license': 'OPL-1',
    'category': 'Point of Sale',
    'version': '15.0.1.0.0',
    'installable': True,
    'auto_install': False,
    'depends': ['point_of_sale', 'hotel_housekeeping', 'product', 'pos_restaurant'],
    'data': [
        'views/housekeeping_view.xml',
        'views/product_view.xml',
    ],
    'assets': {
        'point_of_sale.assets': [
            '/itl_pos_order/static/src/js/new_order.js',
        ],
        'web.assets_qweb': [
            '/itl_pos_order/static/src/xml/pos_order.xml',
            '/itl_pos_order/static/src/xml/ticket.xml',
            #'point_of_sale/static/src/xml/**/*',
        ],
    }
}
