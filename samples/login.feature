Feature: User Login

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter username "user@example.com" and password "password123"
    Then I should be redirected to the dashboard
    And I should see the welcome message

  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I enter username "user@example.com" and password "wrongpassword"
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page
