# Contributing to Carrots

Thank you for your interest in contributing to Carrots! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Follow the setup instructions in [GETTING_STARTED.md](./docs/GETTING_STARTED.md)
4. Create a new branch for your feature or fix

## Development Process

### 1. Branch Naming

Use descriptive branch names:
- Feature: `feature/add-user-authentication`
- Bug fix: `fix/liability-calculation-error`
- Documentation: `docs/update-api-docs`
- Refactor: `refactor/simplify-auth-middleware`

### 2. Making Changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation as needed
- Write tests for new features

### 3. Testing

Before submitting a PR:

```bash
# Run linters
npm run lint

# Run tests
npm test

# Check test coverage
npm run test:coverage
```

### 4. Committing

Write clear commit messages:
- Use present tense ("Add feature" not "Added feature")
- Start with a verb ("Fix", "Add", "Update", "Refactor")
- Keep the first line under 50 characters
- Add detailed description if needed

Examples:
```
Add user registration endpoint

- Implement POST /api/auth/register
- Add input validation with Zod
- Hash passwords with bcrypt
- Return JWT token on success
```

### 5. Pull Requests

1. Push your changes to your fork
2. Create a pull request to the main repository
3. Fill out the PR template (if available)
4. Link any related issues
5. Wait for review

PR Checklist:
- [ ] Tests pass
- [ ] Code is linted
- [ ] Documentation is updated
- [ ] No console.log statements (use logger)
- [ ] Types are properly defined
- [ ] Breaking changes are documented

## Code Style

### TypeScript/JavaScript

- Use TypeScript for type safety
- Use meaningful variable names
- Prefer `const` over `let`
- Use async/await over promises
- Handle errors appropriately
- Don't use `any` type (use `unknown` if necessary)

### React

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper prop types
- Handle loading and error states

### Backend

- Follow RESTful API conventions
- Use proper HTTP status codes
- Validate all inputs
- Log important events
- Handle errors gracefully

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed project structure.

## Testing

### Backend Tests

- Write unit tests for services
- Write integration tests for API endpoints
- Use meaningful test descriptions
- Mock external dependencies
- Aim for 80%+ code coverage

Example:
```typescript
describe('LiabilityCalculator', () => {
  describe('calculateGroupLiabilities', () => {
    it('should return empty array when no commitments exist', async () => {
      // Test implementation
    });
  });
});
```

### Frontend Tests

- Test component rendering
- Test user interactions
- Test edge cases
- Use React Testing Library

Example:
```typescript
describe('LoginForm', () => {
  it('should display error message on invalid credentials', () => {
    // Test implementation
  });
});
```

## Documentation

- Update README.md if adding new features
- Update API.md for API changes
- Add JSDoc comments for complex functions
- Update ARCHITECTURE.md for architectural changes

## Reporting Issues

When reporting issues:

1. Check if the issue already exists
2. Use a clear, descriptive title
3. Provide steps to reproduce
4. Include error messages and logs
5. Specify your environment (OS, Node version, etc.)

## Feature Requests

When requesting features:

1. Explain the use case
2. Describe the expected behavior
3. Provide examples if possible
4. Discuss potential implementations

## Questions?

- Open a GitHub issue for questions
- Check existing documentation first
- Be specific about your question

Thank you for contributing! 🥕
