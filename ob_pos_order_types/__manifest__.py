# -*- coding: utf-8 -*-
######################################################################################
#
#    Odoo Being
#
#    Copyright (C) 2021-TODAY Odoo Being(<https://www.odoobeing.com>).
#    Author: Odoo Being(<https://www.odoobeing.com>)
#
#    This program is under the terms of the Odoo Proprietary License v1.0 (OPL-1)
#    It is forbidden to publish, distribute, sublicense, or sell copies of the Software
#    or modified copies of the Software.
#
#    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
#    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
#    DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
#    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
#    DEALINGS IN THE SOFTWARE.
#
########################################################################################
{
    'name': "POS Order Types",

    'summary': """
        Helps to choose the order type.""",

    'description': """
        pos order types, pos, odoo15 pos, pos odoo15, odoo 15, order types, receipt, custom receipt in odoo15,
        odoo15 receipt, odoobeing, odoo 15 point of sale, odoo15 point of sale, odoo 15 receipt, pos screen,
        point of sale, custom order in pos, custom popup in pos, odoo 15 pos popup, odoo 15 pos report,
        odoo15 pos report, pos report odoo15, odoo15.""",

    'author': "Odoo Being",
    'website': "https://www.odoobeing.com",
    'license': 'OPL-1',
    'category': 'Point of Sale',
    'version': '15.0.1.0.0',
    'support': 'odoobeing@gmail.com',
    'price': '8',
    'images': ['static/description/images/pos_order_types_odoo_being.png'],
    'currency': 'USD',
    'installable': True,
    'auto_install': False,
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
    ],
    'assets': {
        'point_of_sale.assets': [
            '/ob_pos_order_types/static/src/js/ordertype.js',
            '/ob_pos_order_types/static/src/js/receipt.js',
        ],
        'web.assets_qweb': [
            'ob_pos_order_types/static/src/xml/**/*',
        ],
    }
}
