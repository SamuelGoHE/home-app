'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('project_photos', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      storage_path: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      stage: {
        type: Sequelize.ENUM('antes', 'durante', 'despues'),
        allowNull: false,
      },
      caption: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onDelete: 'CASCADE',
      },
      uploaded_by: {
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

    await queryInterface.addIndex('project_photos', ['project_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('project_photos');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_project_photos_stage"');
  },
};
