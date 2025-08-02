import React from 'react'

interface UsageSectionProps {
  children: React.ReactNode
}

const UsageSection = ({ children }: UsageSectionProps) => {
  return (
    <div style={{
      margin: '-20px auto 20px auto',
      padding: '16px',
      backgroundColor: 'white',
      border: '1px solid purple',
      borderRadius: '5px',
      minHeight: '140px',
      width: '600px',
      maxWidth: 'calc(100% - 60px)'
    }}>
      <h3 style={{
        color: 'var(--primary)',
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600'
      }}>Usage:</h3>
      
      <ul style={{
        margin: 0,
        paddingLeft: '20px',
        listStyleType: 'disc'
      }}>
        {children}
      </ul>
    </div>
  )
}

export default UsageSection 