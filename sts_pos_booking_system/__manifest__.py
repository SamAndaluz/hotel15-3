{
    'name': 'POS booking system extend',
    'version': '15.0.1.0.0',
    'category': 'Delivery',
    'summary': 'customisations for POS Booking System',
    'license': 'LGPL-3',

    'author': 'ShivTech Solutions',
    'website': 'https://www.shivtechsolutions.com',
    'maintainer': 'ShivTech Solutions',

    'depends': ['pos_booking_system', 'pos_restaurant'],
    'data': [
        'views/booking_order.xml',
    ],
    'assets':  {
    'point_of_sale.assets': [
        ('replace', 'pos_booking_system/static/src/js/main.js', 'sts_pos_booking_system/static/src/js/main.js'),
        ('replace', 'pos_booking_system/static/src/js/screens.js', 'sts_pos_booking_system/static/src/js/screens.js'),
        ('replace', 'pos_booking_system/static/src/js/slots.js', 'sts_pos_booking_system/static/src/js/slots.js'),

        'sts_pos_booking_system/static/src/js/TableWidget.js',
        #'sts_pos_booking_system/static/src/js/FloorScreen.js',
        ],
    'web.assets_qweb': [
            'sts_pos_booking_system/static/src/xml/**/*',
        ],
    },

    'installable': True,
    'auto_install': False,
    'application': True,
}
