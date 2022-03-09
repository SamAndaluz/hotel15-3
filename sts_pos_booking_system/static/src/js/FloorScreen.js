odoo.define('sts_pos_booking_system.FloorScreen', function (require) {
    'use strict';

    const Registries = require('point_of_sale.Registries');
    const FloorScreen = require('pos_restaurant.FloorScreen');

    const PosResFloorScreen = FloorScreen =>
        class extends FloorScreen {
        mounted() {
            this._super();
            // call _tableLongpolling once then set interval of 1sec.
            this._showRoomTimer();
            this.showRoomTimer = setInterval(this._showRoomTimer.bind(this), 1000);
        }
        willUnmount() {
            this._super();
            clearInterval(this.showRoomTimer);
        }
        async _tableLongpolling() {
            if (this.state.isEditMode) {
                return;
            }
            try {
                const result = await this.rpc({
                    model: 'pos.config',
                    method: 'get_tables_order_count',
                    args: [this.env.pos.config.id],
                });
                result.forEach((table) => {
                    const table_obj = this.env.pos.tables_by_id[table.id];
                    const unsynced_orders = this.env.pos
                        .get_table_orders(table_obj)
                        .filter(
                            (o) =>
                                o.server_id === undefined &&
                                (o.orderlines.length !== 0 || o.paymentlines.length !== 0) &&
                                // do not count the orders that are already finalized
                                !o.finalized
                        ).length;
                    table_obj.order_count = table.orders + unsynced_orders;
                });
                this.render();
            } catch (error) {
                if (error.message.code < 0) {
                    await this.showPopup('OfflineErrorPopup', {
                        title: this.env._t('Offline'),
                        body: this.env._t('Unable to get orders count'),
                    });
                } else {
                    throw error;
                }
            }
        }
        };

    Registries.Component.extend(FloorScreen, PosResFloorScreen);
    return FloorScreen;
});