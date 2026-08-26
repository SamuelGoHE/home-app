const User = require('./User');
const Service = require('./Service');
const Project = require('./Project');
const Task = require('./Task');
const Quote = require('./Quote');
const WorkerProfile = require('./WorkerProfile');
const Rating = require('./Rating');
const Message = require('./Message');
const ProjectPhoto = require('./ProjectPhoto');
const WorkerPortfolioPhoto = require('./WorkerPortfolioPhoto');

// WorkerProfile ↔ User
User.hasOne(WorkerProfile, { foreignKey: 'user_id', as: 'workerProfile' });
WorkerProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Project ↔ Users
User.hasMany(Project, { foreignKey: 'client_id', as: 'clientProjects' });
Project.belongsTo(User, { foreignKey: 'client_id', as: 'client' });
User.hasMany(Project, { foreignKey: 'admin_id', as: 'managedProjects' });
Project.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });
User.hasMany(Project, { foreignKey: 'worker_id', as: 'workerProjects' });
Project.belongsTo(User, { foreignKey: 'worker_id', as: 'worker' });

// Project ↔ Service
Service.hasMany(Project, { foreignKey: 'service_id', as: 'projects' });
Project.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

// Task ↔ Project
Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Task ↔ Users
User.hasMany(Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Quote ↔ Users + Service + Project
User.hasMany(Quote, { foreignKey: 'client_id', as: 'quotes' });
Quote.belongsTo(User, { foreignKey: 'client_id', as: 'client' });
Service.hasMany(Quote, { foreignKey: 'service_id', as: 'quotes' });
Quote.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
User.hasMany(Quote, { foreignKey: 'worker_id', as: 'workerQuotes' });
Quote.belongsTo(User, { foreignKey: 'worker_id', as: 'worker' });
Project.hasOne(Quote, { foreignKey: 'project_id', as: 'quote' });
Quote.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Rating ↔ Users + Project
User.hasMany(Rating, { foreignKey: 'reviewer_id', as: 'givenRatings' });
Rating.belongsTo(User, { foreignKey: 'reviewer_id', as: 'reviewer' });
User.hasMany(Rating, { foreignKey: 'worker_id', as: 'receivedRatings' });
Rating.belongsTo(User, { foreignKey: 'worker_id', as: 'worker' });
Project.hasMany(Rating, { foreignKey: 'project_id', as: 'ratings' });
Rating.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Message ↔ Project + User
Project.hasMany(Message, { foreignKey: 'project_id', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// ProjectPhoto ↔ Project + User
Project.hasMany(ProjectPhoto, { foreignKey: 'project_id', as: 'photos', onDelete: 'CASCADE' });
ProjectPhoto.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
User.hasMany(ProjectPhoto, { foreignKey: 'uploaded_by', as: 'uploadedPhotos' });
ProjectPhoto.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// WorkerPortfolioPhoto ↔ User
User.hasMany(WorkerPortfolioPhoto, { foreignKey: 'worker_id', as: 'portfolioPhotos', onDelete: 'CASCADE' });
WorkerPortfolioPhoto.belongsTo(User, { foreignKey: 'worker_id', as: 'worker' });

module.exports = { User, Service, Project, Task, Quote, WorkerProfile, Rating, Message, ProjectPhoto, WorkerPortfolioPhoto };