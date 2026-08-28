'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Corrige una suposición de la fase 1: se guardaba solo account_number_last4
    // asumiendo que Wompi guardaría el número completo como "fuente de verdad"
    // al registrar un destinatario. La API real de Payouts (confirmada contra
    // docs.wompi.co) no tiene ese registro previo — el número completo va en
    // cada POST /payouts, así que hay que persistirlo nosotros. account_number_last4
    // se deja igual (evita reventar la UI que ya lo muestra).
    await queryInterface.addColumn('worker_payout_accounts', 'account_number', {
      type: Sequelize.STRING(30),
      allowNull: true, // nullable para no romper filas ya registradas antes de este fix
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('worker_payout_accounts', 'account_number');
  },
};
