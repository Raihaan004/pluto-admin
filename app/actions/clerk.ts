"use server"

import { createClerkClient } from "@clerk/nextjs/server"

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export async function createClerkOrganization(name: string, adminEmail: string) {
  try {
    // 1. Create the organization in Clerk
    const organization = await clerkClient.organizations.createOrganization({
      name: name,
      // You can also pass slug or other metadata if needed
    })

    // 2. Optionally: Search for the user by email to add them as an admin member
    // This is useful if the user already exists in Clerk
    const userList = await clerkClient.users.getUserList({
      emailAddress: [adminEmail],
    })

    if (userList.data.length > 0) {
      const userId = userList.data[0].id
      await clerkClient.organizations.createOrganizationMembership({
        organizationId: organization.id,
        userId: userId,
        role: "org:admin",
      })
    }

    return { 
      success: true, 
      clerkOrgId: organization.id 
    }
  } catch (error: any) {
    console.error("Error creating Clerk organization:", error)
    return { 
      success: false, 
      error: error.message || "Failed to create organization in Clerk" 
    }
  }
}

export async function deleteClerkOrganization(organizationId: string) {
  try {
    await clerkClient.organizations.deleteOrganization({
      organizationId: organizationId,
    })
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting Clerk organization:", error)
    return { 
      success: false, 
      error: error.message || "Failed to delete organization in Clerk" 
    }
  }
}
