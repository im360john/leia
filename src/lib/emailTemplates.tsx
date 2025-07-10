import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Link,
  Hr,
  Preview,
} from '@react-email/components'

interface BaseEmailProps {
  previewText?: string
  companyName?: string
  footerText?: string
}

interface MarketingEmailProps extends BaseEmailProps {
  subject: string
  content: string
  ctaText?: string
  ctaUrl?: string
  recipientName?: string
}

export const MarketingEmailTemplate: React.FC<MarketingEmailProps> = ({
  previewText = '',
  companyName = 'Your Company',
  footerText,
  content,
  ctaText,
  ctaUrl,
  recipientName,
}) => {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{companyName}</Heading>
          </Section>

          <Section style={contentSection}>
            {recipientName && (
              <Text style={greeting}>Hi {recipientName},</Text>
            )}
            
            <div dangerouslySetInnerHTML={{ __html: content }} />

            {ctaText && ctaUrl && (
              <Section style={buttonSection}>
                <Button style={button} href={ctaUrl}>
                  {ctaText}
                </Button>
              </Section>
            )}
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerTextStyle}>
              {footerText || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}
            </Text>
            <Link href="%unsubscribe_url%" style={link}>
              Unsubscribe
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

interface WelcomeEmailProps extends BaseEmailProps {
  userName: string
  loginUrl?: string
}

export const WelcomeEmailTemplate: React.FC<WelcomeEmailProps> = ({
  previewText = 'Welcome to our platform!',
  companyName = 'Your Company',
  userName,
  loginUrl = '#',
}) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{companyName}</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading as="h2" style={h2}>
              Welcome aboard, {userName}! 🎉
            </Heading>
            
            <Text style={text}>
              We're thrilled to have you join our community. Your account has been
              successfully created and you're all set to start exploring.
            </Text>

            <Text style={text}>
              Here's what you can do next:
            </Text>

            <ul style={list}>
              <li>Complete your profile</li>
              <li>Create your first campaign</li>
              <li>Explore our analytics dashboard</li>
              <li>Connect with Leia, your marketing strategist</li>
            </ul>

            <Section style={buttonSection}>
              <Button style={button} href={loginUrl}>
                Get Started
              </Button>
            </Section>

            <Text style={text}>
              If you have any questions, feel free to reply to this email or
              check out our help center.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerTextStyle}>
              © {new Date().getFullYear()} {companyName}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

interface TransactionalEmailProps extends BaseEmailProps {
  title: string
  message: string
  actionText?: string
  actionUrl?: string
  additionalInfo?: string
}

export const TransactionalEmailTemplate: React.FC<TransactionalEmailProps> = ({
  previewText,
  companyName = 'Your Company',
  title,
  message,
  actionText,
  actionUrl,
  additionalInfo,
}) => {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{companyName}</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading as="h2" style={h2}>{title}</Heading>
            
            <Text style={text}>{message}</Text>

            {actionText && actionUrl && (
              <Section style={buttonSection}>
                <Button style={button} href={actionUrl}>
                  {actionText}
                </Button>
              </Section>
            )}

            {additionalInfo && (
              <Text style={smallText}>{additionalInfo}</Text>
            )}
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerTextStyle}>
              This is an automated message from {companyName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '24px 32px',
  backgroundColor: '#007bff',
}

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '16px 0',
}

const contentSection = {
  padding: '32px',
}

const greeting = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const smallText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
}

const list = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  paddingLeft: '20px',
}

const buttonSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#007bff',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const footer = {
  padding: '0 32px',
}

const footerTextStyle = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
}

const link = {
  color: '#007bff',
  fontSize: '12px',
  textDecoration: 'underline',
}