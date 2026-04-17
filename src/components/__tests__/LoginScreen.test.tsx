import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// supabase is already globally mocked in setup.ts

vi.mock('../Logo', () => ({
  Logo: ({ size }: any) => <div data-testid="logo" style={{ width: size, height: size }} />,
}))

import { LoginScreen } from '../LoginScreen'
import { supabase } from '../../lib/supabase'

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<LoginScreen />)
    expect(document.body.firstChild).toBeTruthy()
  })

  it('renders logo', () => {
    render(<LoginScreen />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('renders sign-in heading by default', () => {
    render(<LoginScreen />)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('renders email input', () => {
    render(<LoginScreen />)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
  })

  it('renders password input in sign-in mode', () => {
    render(<LoginScreen />)
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('renders sign-in button', () => {
    render(<LoginScreen />)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('switches to sign-up mode', () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByText('Sign up'))
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByText('Create account')).toBeInTheDocument()
  })

  it('shows confirm password in sign-up mode', () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByText('Sign up'))
    expect(screen.getByPlaceholderText('Repeat your password')).toBeInTheDocument()
  })

  it('switches to forgot password mode', () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByText('Forgot password?'))
    expect(screen.getByText('Reset password')).toBeInTheDocument()
    expect(screen.getByText('Send reset link')).toBeInTheDocument()
  })

  it('hides password field in forgot mode', () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByText('Forgot password?'))
    expect(screen.queryByPlaceholderText('Enter your password')).not.toBeInTheDocument()
  })

  it('calls supabase signInWithPassword on submit', async () => {
    const signInMock = vi.fn().mockResolvedValue({ error: null });
    (supabase.auth.signInWithPassword as any) = signInMock

    render(<LoginScreen />)
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByText('Sign in'))

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('shows error message when sign-in fails', async () => {
    const signInMock = vi.fn().mockResolvedValue({ error: { message: 'Invalid credentials' } });
    (supabase.auth.signInWithPassword as any) = signInMock

    render(<LoginScreen />)
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'wrongpassword' },
    })
    fireEvent.click(screen.getByText('Sign in'))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('shows password mismatch error in sign-up mode', async () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByText('Sign up'))
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), {
      target: { value: 'pass123' },
    })
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), {
      target: { value: 'different' },
    })
    fireEvent.click(screen.getByText('Create account'))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('goes back to sign-in from sign-up mode', () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByText('Sign up'))
    fireEvent.click(screen.getByText('Sign in'))
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })
})
