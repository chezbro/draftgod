module.exports = {
  extends: 'next/core-web-vitals',
  rules: {
    'react-hooks/exhaustive-deps': 'warn', // Downgrade from error to warning
    'prefer-const': 'warn', // Downgrade from error to warning
  },
}; 