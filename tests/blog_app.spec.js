const { test, expect, beforeEach, describe, beforeAll } = require('@playwright/test')
const { hasUncaughtExceptionCaptureCallback } = require('process')

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

    test("only blog added user see Delete button", async ({ page }) => {
        const blogWithNoDelete = page.locator("div.playwrightblog", { hasText: "Dub" })
        await blogWithNoDelete.getByRole("button", { name: "View" }).click()

        const blogWithDelete = page.locator("div.playwrightblog", { hasText: "Kinestetiikka" })
        await blogWithDelete.getByRole("button", {name: "View"}).click()

        await expect(blogWithNoDelete.getByRole("button", { name: "Delete" })).not.toBeVisible()
        await expect(blogWithDelete.getByRole("button", { name: "Delete" })).toBeVisible()
      })

      test("blogs are ordered by popularity, with the highest number of likes at the top", async ({ page }) => {
        const blogs = [
          { title: "Blog A", author: "Author A", url: "a.com", likes: 5},
          { title: "Blog B", author: "Author B", url: "b.com", likes: 10},
          { title: "Blog C", author: "Author C", url: "c.com", likes: 2}
        ]

        for (const blog of blogs) {
          await page.getByRole("button", { name: "New blog" }).click()
          await page.getByLabel("title").fill(blog.title)
          await page.getByLabel("author").fill(blog.author)
          await page.getByLabel("url").fill(blog.url)
          await page.getByRole("button", { name: "Add blog" }).click()

          const blogItem = page.locator("div.playwrightblog", { hasText: blog.title })
          await blogItem.getByRole("button", { name: "View" }).click()

          for ( let i = 0; i < blog.likes; i++) {
            await blogItem.getByRole("button", { name: "Like" }).click()
          }
        }

        await page.waitForTimeout(1000)

        const blogItems = await page.locator("div.playwrightblog").filter({ hasText: /Blog/}).all()

        const likeCounts = []
        for (const item of blogItems) {
          const text = await item.textContent()
          const match = text.match(/Likes:\s*(\d+)/)
          likeCounts.push(match ? parseInt(match[1], 10) : 0)
        }
        const sorted = [...likeCounts].sort((a, b) => b - a)
        expect(likeCounts).toEqual(sorted)
      })

    test("user can delete the blog", async ({ page }) => {
        const blogItem = page.locator("div.playwrightblog", { hasText: "Kinestetiikka" })
        await blogItem.getByRole("button", { name: "View" }).click()

        page.once("dialog", async dialog => {
          expect(dialog.message()).toContain("Sure you want to delete blog Kinestetiikka by KinMaster")
          await dialog.accept()
        })
        await blogItem.getByRole("button", { name: "Delete" }).click()
        await expect(page.locator("div.playwrightblog", { hasText: "Kinestetiikka"})).not.toBeVisible()
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