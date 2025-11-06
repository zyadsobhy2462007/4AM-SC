// Input validation middleware

function validateRegister(req, res, next) {
  const { name, email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required and must be a string');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (name && typeof name !== 'string') {
    errors.push('Name must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  next();
}

function validateTask(req, res, next) {
  const { title, description } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string') {
    errors.push('Title is required and must be a string');
  } else if (title.trim().length === 0) {
    errors.push('Title cannot be empty');
  } else if (title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }

  if (description && typeof description !== 'string') {
    errors.push('Description must be a string');
  } else if (description && description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateTask
};

