package web

func AssertNil(errs ...error) {
	for _, item := range errs {
		if item != nil {
			panic(item)
		}
	}
}

func AssertNexNotFound(err error) bool {
	if err != nil && err.Error() == "not found" {
		return true
	} else if err != nil {
		panic(err)
	}
	return false
}

func AssertOkNotFound(err error) {
	if err != nil && err.Error() == "not found" {
		err = ErrorOK("no record")
	} else if err != nil {
		panic(err)
	}
}

func IsNotFound(err error) bool {
	if err != nil && err.Error() == "not found" {
		return true
	}
	return false
}

func Contains(slice []string, val string) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}
	return false
}
