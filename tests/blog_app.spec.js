const { test, expect, beforeEach, describe } = require('@playwright/test')

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    await request.post('http://localhost:3003/api/testing/reset')
    await request.post('http://localhost:3003/api/users', {
      data: {
        name: 'Ze Roberto',
        username: 'ZeR',
        password: 'sek'
      }
    })

    await page.goto('http://localhost:5173')
  })

  test('Login form is shown', async ({ page }) => {
    await page.goto('http://localhost:5173')

    await expect(page.getByText("Blogs")).toBeVisible()
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible()
  })

  describe("Login", () => {
    test("succeeds with correct credentials", async ({ page }) => {
      await page.getByLabel("username").fill("ZeR")
      await page.getByLabel("password").fill("sek")
      await page.getByRole("button", { name: "Login"}).click()

      await expect(page.locator(".notification.success")).toContainText("User ZeR logged in")
    })

    test("fails with wrong credentials", async ({ page }) => {
      await page.getByLabel("username").fill("ZeR")
      await page.getByLabel("password").fill("sec")
      await page.getByRole("button", { name: "Login"}).click()

      await expect(page.locator(".notification.error")).toContainText("wrong username or password")
    })
  })

  describe("When logged in", () => {
    beforeEach(async ({ page }) => {
      await page.getByLabel("username").fill("ZeR")
      await page.getByLabel("password").fill("sek")
      await page.getByRole("button", { name: "Login"}).click()
    })

    test("a new blog can be created", async ({ page }) => {
      await page.getByRole("button", { name: "New blog" }).click()
      await page.getByLabel("title").fill("Kinestetiikka")
      await page.getByLabel("author").fill("KinMaster")
      await page.getByLabel("url").fill("www.kines.com")
      await page.getByRole("button", { name: "Add blog" }).click()
      await expect(page.locator("div.playwrightblog", { hasText: "Kinestetiikka"})).toBeVisible()
    })

    describe("and a blog exist", () => {
      beforeEach(async ({ page }) => {
        await page.getByRole("button", { name: "New blog" }).click()
        await page.getByLabel("title").fill("Yoga")
        await page.getByLabel("author").fill("Guru")
        await page.getByLabel("url").fill("www.yoga.com")
        await page.getByRole("button", { name: "Add blog" }).click()
      })
      test("like button works", async ({ page }) => {
        const blogItem = page.locator("div.playwrightblog", { hasText: "Yoga" })
        await blogItem.getByRole("button", { name: "View" }).click()

        const likesText = blogItem.locator("text=Likes:")
        const initialLikes = await likesText.textContent()

        const initialCount = parseInt(initialLikes.replace("Likes: ", ""), 10)

        await blogItem.getByRole("button", { name: "Like" }).click()

        await expect(blogItem.locator(`text=Likes: ${initialCount + 1}`)).toBeVisible()
        
      })
    })
  })
})