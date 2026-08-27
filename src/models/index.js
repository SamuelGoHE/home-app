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
const WorkerPayoutAccount = require('./WorkerPayoutAccount');
const Payment = require('./Payment');
const Payout = require('./Payout');
const Refund = require('./Refund');

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

// WorkerPayoutAccount ↔ User (trabajador dueño + admin_finanzas que verifica)
User.hasOne(WorkerPayoutAccount, { foreignKey: 'worker_id', as: 'payoutAccount', onDelete: 'CASCADE' });
WorkerPayoutAccount.belongsTo(User, { foreignKey: 'worker_id', as: 'worker' });
User.hasMany(WorkerPayoutAccount, { foreignKey: 'verified_by', as: 'verifiedPayoutAccounts' });
WorkerPayoutAccount.belongsTo(User, { foreignKey: 'verified_by', as: 'verifier' });

// Payment ↔ Project + User (cliente)
Project.hasMany(Payment, { foreignKey: 'project_id', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
User.hasMany(Payment, { foreignKey: 'client_id', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Payout ↔ Project + User (trabajador + admin_finanzas que aprueba)
Project.hasOne(Payout, { foreignKey: 'project_id', as: 'payout', onDelete: 'CASCADE' });
Payout.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
User.hasMany(Payout, { foreignKey: 'worker_id', as: 'payouts' });
Payout.belongsTo(User, { foreignKey: 'worker_id', as: 'worker' });
User.hasMany(Payout, { foreignKey: 'approved_by', as: 'approvedPayouts' });
Payout.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// Refund ↔ Project + User (cliente) + Payment (el pago inicial reembolsado)
Project.hasMany(Refund, { foreignKey: 'project_id', as: 'refunds', onDelete: 'CASCADE' });
Refund.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
User.hasMany(Refund, { foreignKey: 'client_id', as: 'refunds' });
Refund.belongsTo(User, { foreignKey: 'client_id', as: 'client' });
User.hasMany(Refund, { foreignKey: 'approved_by', as: 'approvedRefunds' });
Refund.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
Payment.hasOne(Refund, { foreignKey: 'payment_id', as: 'refund' });
Refund.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });

module.exports = {
  User, Service, Project, Task, Quote, WorkerProfile, Rating, Message,
  ProjectPhoto, WorkerPortfolioPhoto, WorkerPayoutAccount, Payment, Payout, Refund,
};