'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tasks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pendiente', 'en_progreso', 'en_revision', 'completada', 'bloqueada'),
        defaultValue: 'pendiente',
      },
      priority: {
        type: Sequelize.ENUM('baja', 'media', 'alta', 'urgente'),
        defaultValue: 'media',
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      estimated_hours: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      actual_hours: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      evidence_urls: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onDelete: 'CASCADE',
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('tasks', ['project_id']);
    await queryInterface.addIndex('tasks', ['assigned_to']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tasks');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tasks_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tasks_priority"');
  },
};
