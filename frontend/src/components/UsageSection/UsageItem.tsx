import React from 'react'

interface UsageItemProps {
  children: React.ReactNode
}

const UsageItem = ({ children }: UsageItemProps) => {
  return (
    <li style={{ margin: '4px 0' }}>
      {children}
    </li>
  )
}

export default UsageItem 
