odoo.define('ob_pos_order_types.order_types', function (require) {
"use strict";


    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const Registries = require('point_of_sale.Registries');
    const { useListener } = require('web.custom_hooks');

    var models = require('point_of_sale.models');

    models.load_models([{
        model:  'ob.order.type',
        fields: ['name', 'id'],
        domain: function(self){ return [['id','in',self.config.order_type_ids]]; },
        loaded: function(self, order_type_ids){
                self.order_type_ids = order_type_ids;
            }
    }]);

    var _super_order = models.Order;

    models.Order = models.Order.extend({
        initialize: function (attr, options) {
            _super_order.prototype.initialize.call(this, attr, options);
            this.order_type_id = this.order_type_id || false;
        },
        export_as_JSON: function(){
            var json = _super_order.prototype.export_as_JSON.apply(this,arguments);
            json.order_type_id = this.order_type_id || false;
            json.order_type  = this.order_type_id ? this.order_type_id.id : false;
            return json;
        },
        init_from_JSON: function(json){
            _super_order.prototype.init_from_JSON.apply(this,arguments);
            this.order_type_id = json.order_type_id || false;

        },
    });


    class PosOrderType extends PosComponent {
        constructor() {
            super(...arguments);
            useListener('click', this.onClick);
        }
        mounted() {
            this.env.pos.get('orders').on('add remove change', () => this.render(), this);
            this.env.pos.on('change:selectedOrder', () => this.render(), this);
        }
        willUnmount() {
            this.env.pos.get('orders').off('add remove change', null, this);
            this.env.pos.off('change:selectedOrder', null, this);
        }
        get currentOrderType() {
                return this.currentOrder && this.currentOrder.order_type_id
                    ? this.currentOrder.order_type_id.name
                    : this.env._t('Order type');
            }
        get currentOrder() {
                return this.env.pos.get_order();
            }
        async onClick() {
            var self = this;
            const currentOrder_type = this.currentOrder.order_type_id;
            const OrderTypeList = [
                {
                    id: -1,
                    label: this.env._t('None'),
                    isSelected: !currentOrder_type,
                },
            ];
            for (let delMethods of this.env.pos.order_type_ids) {
                OrderTypeList.push({
                    id: delMethods.id,
                    label: delMethods.name,
                    isSelected: currentOrder_type
                        ? delMethods.id === currentOrder_type.id
                        : false,
                    item: delMethods,
                });
            }
            const { confirmed, payload: selectedDeliveryMethods } = await this.showPopup(
                'SelectionPopup',
                {
                    title: 'Select Order Type',
                    list: OrderTypeList,
                }
            );
            if (confirmed) {
                this.currentOrder.order_type_id = selectedDeliveryMethods;
                this.currentOrder.trigger('change');
            }
        }
    }

    PosOrderType.template = 'OrderTypeButton';

    ProductScreen.addControlButton({
        component: PosOrderType,
        condition: function () {
            return this.env.pos.config.select_order_type && this.env.pos.config.order_type_ids.length > 1;
        },
        position: ['before', 'SetPricelistButton'],
    });

    Registries.Component.add(PosOrderType);

    return PosOrderType;

});