# -*- coding: utf-8 -*-
#################################################################################
# Author      : Webkul Software Pvt. Ltd. (<https://webkul.com/>)
# Copyright(c): 2015-Present Webkul Software Pvt. Ltd.
# All Rights Reserved.
#
#
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#
# You should have received a copy of the License along with this program.
# If not, see <https://store.webkul.com/license.html/>
#################################################################################
{
  "name"                 :  "POS Booking Management",
  "summary"              :  "This module is used to create booking, review booking and assign booking.",
  "category"             :  "Point of Sale",
  "version"              :  "1.0",
  "sequence"             :  1,
  "author"               :  "Webkul Software Pvt. Ltd.",
  "license"              :  "Other proprietary",
  "website"              :  "https://store.webkul.com/",
  "depends"              :  ['point_of_sale','website_booking_system'],
  "data"                 :  [
                              'security/pos_booking_system_security.xml',
                              'security/ir.model.access.csv',
                              'views/mail_template.xml',
                            #  'views/template.xml',
                              'data/cron.xml',
                              'views/pos_booking_system.xml',
                              'wizard/pos_booking_system_wizard_view.xml',
                            ],

#  "qweb"                 :  [
#                              'static/src/xml/pos_booking_system.xml',
#                              'static/src/xml/slots.xml'
#                              ],
  "assets"               :  {
                              'point_of_sale.assets': [
                                "pos_booking_system/static/src/css/pos_booking_system.css",
                                "pos_booking_system/static/src/js/main.js",
                                "pos_booking_system/static/src/js/screens.js",
                                "pos_booking_system/static/src/js/slots.js",
                                "pos_booking_system/static/src/jquery-UI/jquery-ui.css",
                                "pos_booking_system/static/src/jquery-UI/jquery-ui.js"
                                 ],
                              'web.assets_qweb': [
                                'pos_booking_system/static/src/xml/**/*',
                              ],
                            },

 "live_test_url"        :  "http://odoodemo.webkul.com/?module=pos_booking_system&custom_url=/pos/auto",
  "images"               :  ['static/description/pos_booking_system.gif'],
  "application"          :  True,
  "installable"          :  True,
  "auto_install"         :  False,
  "price"                :  99,
  "currency"             :  "USD",
  "pre_init_hook"        :  "pre_init_check",
}
