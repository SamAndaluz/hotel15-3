# -*- coding: utf-8 -*-

{
    'name': "Pos Session Profit and Loss Report",
    'version': '1',
    'summary': "Allows you to show session report with profit and loss.",
    'author': 'ErpMstar Solutions',
    'category': 'Point of Sale',
    
    'website': '',

    'depends': ['point_of_sale'],
    'data': [
            # 'security/ir.model.access.csv',
            'views/pos.xml',
            # 'views/report_saledetails.xml'
        ],
    'qweb': [
        # 'static/src/xml/pos.xml',
    ],
    'images': ['static/description/banner.jpg'],
    'price': 7,
    'currency': 'EUR',
    'installable': True,
}
